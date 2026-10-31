"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { auth } from "@/server/auth";
import { loginSchema } from "@/lib/validations/auth";
import { clearFailures, clientIp, recordFailure, tooManyFailures } from "@/server/rate-limit";

/** Password guessing: at most 5 failed tries per account and 10 per connection every 15 minutes. */
const LOGIN_WINDOW_MS = 15 * 60_000;

export type LoginState = {
  error?: string;
  fieldErrors?: { email?: string[]; password?: string[] };
  email?: string;
};

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, email };

  // auth.api calls skip Better Auth's own HTTP rate limit, so the login form is limited here.
  // Only failures count: signing in often (several devices) never blocks the real user.
  const accountKey = `login:email:${parsed.data.email.toLowerCase()}`;
  const ipKey = `login:ip:${await clientIp()}`;
  if (tooManyFailures(accountKey, 5, LOGIN_WINDOW_MS) || tooManyFailures(ipKey, 10, LOGIN_WINDOW_MS)) {
    return { error: "Trop de tentatives de connexion. Réessayez dans 15 minutes.", email };
  }

  let needsSecondStep = false;
  try {
    const res = await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
    // Two-step login on (and this device not trusted): no session yet, a short-lived signed cookie instead.
    needsSecondStep = "twoFactorRedirect" in res && res.twoFactorRedirect === true;
  } catch (err) {
    if (err instanceof APIError) {
      recordFailure(accountKey);
      recordFailure(ipKey);
      return { error: "Adresse e-mail ou mot de passe incorrect.", email };
    }
    throw err;
  }
  clearFailures(accountKey);
  redirect(needsSecondStep ? "/connexion/verification" : "/tableau-de-bord");
}

export async function logout() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/connexion");
}
