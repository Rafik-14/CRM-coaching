import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { settings } from "@/server/db/schema";

export type BusinessSettings = { name: string; currency: "EUR" | "CHF" };

/** Business name and default currency (settings row « business »). */
export async function getBusinessSettings(): Promise<BusinessSettings> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, "business") });
  const v = (row?.value ?? {}) as { name?: string; currency?: string };
  return { name: v.name ?? "—", currency: v.currency === "CHF" ? "CHF" : "EUR" };
}

/** Currency of a contact: from their country when known, else the business default. */
export async function currencyFor(country: string | null | undefined, explicit?: string | null) {
  if (explicit === "EUR" || explicit === "CHF") return explicit;
  if (country === "CH") return "CHF";
  if (country === "FR") return "EUR";
  return (await getBusinessSettings()).currency;
}
