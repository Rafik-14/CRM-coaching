"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { auth } from "@/server/auth";
import { requireCoach } from "@/server/dal";
import { clientIp, rateLimited, recordFailure, tooManyFailures } from "@/server/rate-limit";

const WINDOW_MS = 15 * 60_000;

/** French message for the two-factor plugin's error codes. */
function message(err: APIError) {
  const code = (err.body as { code?: string } | undefined)?.code;
  switch (code) {
    case "INVALID_TWO_FACTOR_COOKIE":
      return "La vérification a expiré (10 minutes). Reconnectez-vous avec votre mot de passe.";
    case "ACCOUNT_TEMPORARILY_LOCKED":
    case "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE":
      return "Trop de codes incorrects : la vérification est bloquée pendant 15 minutes.";
    case "INVALID_BACKUP_CODE":
      return "Ce code de secours est incorrect ou a déjà servi.";
    case "INVALID_PASSWORD":
      return "Mot de passe incorrect.";
    default:
      return "Code incorrect. Vérifiez l’heure de votre téléphone et réessayez.";
  }
}

// ---------------------------------------------------------------- login, second step

export type SecondStepState = { error?: string; expired?: boolean };

const secondStepSchema = z.object({
  mode: z.enum(["app", "backup"]),
  code: z.string().trim().min(6).max(20),
  trust: z.literal("on").optional(),
});

/** Second step of the login: the 6-digit code from the authenticator app, or a backup code. */
export async function verifySecondStep(_prev: SecondStepState, formData: FormData): Promise<SecondStepState> {
  const parsed = secondStepSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Saisissez le code." };
  // On top of the plugin's own lock (10 wrong codes per account): 10 wrong codes per connection.
  const ipKey = `2fa:ip:${await clientIp()}`;
  if (tooManyFailures(ipKey, 10, WINDOW_MS)) return { error: "Trop de tentatives. Réessayez dans 15 minutes." };
  const { mode, trust } = parsed.data;
  const code = mode === "app" ? parsed.data.code.replace(/\s/g, "") : parsed.data.code.trim();
  const body = { code, trustDevice: trust === "on" };
  try {
    if (mode === "app") await auth.api.verifyTOTP({ body, headers: await headers() });
    else await auth.api.verifyBackupCode({ body, headers: await headers() });
  } catch (err) {
    if (err instanceof APIError) {
      recordFailure(ipKey);
      const expired = (err.body as { code?: string } | undefined)?.code === "INVALID_TWO_FACTOR_COOKIE";
      return { error: message(err), expired };
    }
    throw err;
  }
  redirect("/tableau-de-bord");
}

// ---------------------------------------------------------------- Mon compte › two-step login

export type TwoFactorSetupState = {
  error?: string;
  /** Step 1 done: show the QR code and the key, wait for the first code. */
  qr?: string;
  secret?: string;
  backupCodes?: string[];
  /** Step 2 done: two-step login is on. */
  enabled?: boolean;
};

const passwordSchema = z.object({ password: z.string().min(1).max(200) });

async function guardPassword(userId: string) {
  return rateLimited(`2fa:password:${userId}`, 5, WINDOW_MS)
    ? "Trop de tentatives. Réessayez dans 15 minutes."
    : null;
}

/** Turn on, step 1: check the password, create the secret and the backup codes, return the QR code. */
export async function startTwoFactor(_prev: TwoFactorSetupState, formData: FormData): Promise<TwoFactorSetupState> {
  const user = await requireCoach();
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Saisissez votre mot de passe." };
  const limited = await guardPassword(user.id);
  if (limited) return { error: limited };
  try {
    const res = await auth.api.enableTwoFactor({ body: { password: parsed.data.password }, headers: await headers() });
    if (!("totpURI" in res)) return { error: "L’activation n’a pas pu démarrer. Réessayez." };
    const secret = new URL(res.totpURI).searchParams.get("secret") ?? "";
    const qr = await QRCode.toDataURL(res.totpURI, { margin: 1, width: 220, color: { dark: "#172536", light: "#ffffff" } });
    return { qr, secret, backupCodes: res.backupCodes };
  } catch (err) {
    if (err instanceof APIError) return { error: message(err) };
    throw err;
  }
}

/**
 * Turn on, step 2: the first code from the app proves the setup works; only then is two-step login on.
 * No revalidation here: the dialog still has to show the backup codes; it refreshes the page when closed.
 */
export async function confirmTwoFactor(_prev: TwoFactorSetupState, formData: FormData): Promise<TwoFactorSetupState> {
  await requireCoach();
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { error: "Saisissez les 6 chiffres affichés par l’application." };
  try {
    await auth.api.verifyTOTP({ body: { code }, headers: await headers() });
  } catch (err) {
    if (err instanceof APIError) return { error: message(err) };
    throw err;
  }
  return { enabled: true };
}

export type TwoFactorManageState = { error?: string; backupCodes?: string[]; done?: boolean };

/** New backup codes (the old ones stop working). */
export async function renewBackupCodes(_prev: TwoFactorManageState, formData: FormData): Promise<TwoFactorManageState> {
  const user = await requireCoach();
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Saisissez votre mot de passe." };
  const limited = await guardPassword(user.id);
  if (limited) return { error: limited };
  try {
    const res = await auth.api.generateBackupCodes({ body: { password: parsed.data.password }, headers: await headers() });
    return { backupCodes: res.backupCodes };
  } catch (err) {
    if (err instanceof APIError) return { error: message(err) };
    throw err;
  }
}

/** Turn off two-step login (password required). */
export async function disableTwoFactor(_prev: TwoFactorManageState, formData: FormData): Promise<TwoFactorManageState> {
  const user = await requireCoach();
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Saisissez votre mot de passe." };
  const limited = await guardPassword(user.id);
  if (limited) return { error: limited };
  try {
    await auth.api.disableTwoFactor({ body: { password: parsed.data.password }, headers: await headers() });
  } catch (err) {
    if (err instanceof APIError) return { error: message(err) };
    throw err;
  }
  return { done: true };
}
