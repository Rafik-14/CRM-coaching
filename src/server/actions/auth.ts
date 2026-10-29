"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { auth } from "@/server/auth";
import { loginSchema } from "@/lib/validations/auth";
import { clientIp, rateLimited } from "@/server/rate-limit";

/** Password guessing: at most 5 tries per account and 10 per connection every 15 minutes. */
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
  // Both counters always run, so a blocked IP can't keep probing other accounts.
  const ip = await clientIp();
  const byAccount = rateLimited(`login:email:${parsed.data.email.toLowerCase()}`, 5, LOGIN_WINDOW_MS);
  const byIp = rateLimited(`login:ip:${ip}`, 10, LOGIN_WINDOW_MS);
  if (byAccount || byIp) {
    return { error: "Trop de tentatives de connexion. Réessayez dans 15 minutes.", email };
  }

  try {
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (err) {
    if (err instanceof APIError) {
      return { error: "Adresse e-mail ou mot de passe incorrect.", email };
    }
    throw err;
  }
  redirect("/tableau-de-bord");
}

export async function logout() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/connexion");
}
