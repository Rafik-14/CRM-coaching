import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "coach" | "client";
};

/**
 * Data Access Layer: the only place that reads the session.
 * Every page, server action and route handler goes through these guards.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email, role } = session.user;
  return { id, name, email, role: role === "coach" ? "coach" : "client" };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return user;
}

export async function requireCoach(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "coach") redirect("/connexion");
  return user;
}
