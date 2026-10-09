"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { auth } from "@/server/auth";
import { loginSchema } from "@/lib/validations/auth";

export type LoginState = {
  error?: string;
  fieldErrors?: { email?: string[]; password?: string[] };
  email?: string;
};

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, email };

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
