import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { emailTemplates } from "@/server/db/schema";
import { TEMPLATE_DEFS, TEMPLATE_KEYS, resolveTemplate, type TemplateKey, type TemplateText } from "@/lib/email-templates";

export type ResolvedTemplate = { key: TemplateKey; text: TemplateText; enabled: boolean; customized: boolean };

/** One automatic e-mail: the coach's wording (or the default) and whether it is turned on. */
export async function getTemplate(key: TemplateKey): Promise<ResolvedTemplate> {
  const row = await db.query.emailTemplates.findFirst({ where: eq(emailTemplates.key, key) });
  return { key, text: resolveTemplate(key, row), enabled: row?.enabled ?? true, customized: !!row };
}

/** All automatic e-mails, in the order of Paramètres › E-mails. */
export async function listTemplates() {
  const rows = await db.select().from(emailTemplates);
  return TEMPLATE_KEYS.map((key) => {
    const row = rows.find((r) => r.key === key);
    return { key, def: TEMPLATE_DEFS[key], text: resolveTemplate(key, row), enabled: row?.enabled ?? true, customized: !!row };
  });
}
