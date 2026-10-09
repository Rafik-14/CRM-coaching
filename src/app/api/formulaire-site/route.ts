import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { activityLog, contacts, pipelineStages, tasks } from "@/server/db/schema";
import { siteFormSchema } from "@/lib/validations/phase1";

/**
 * Contact form of the coach's existing website → new lead in the CRM.
 *
 * Accepted when EITHER:
 * - the browser posts from an allowed site (SITE_FORM_ORIGINS, comma-separated), or
 * - the site's backend forwards it with header `x-form-key: <SITE_FORM_SECRET>`.
 * Plus: honeypot field `website`, and a small per-IP rate limit.
 */
const allowedOrigins = (process.env.SITE_FORM_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !allowedOrigins.includes(origin)) return {};
  return { "Access-Control-Allow-Origin": origin, Vary: "Origin" };
}

export function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(origin),
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const secret = process.env.SITE_FORM_SECRET;
  const trustedServer = !!secret && request.headers.get("x-form-key") === secret;
  const trustedOrigin = !!origin && allowedOrigins.includes(origin);
  const headers = corsHeaders(origin);
  const wantsHtml = request.headers.get("accept")?.includes("text/html");

  if (!trustedServer && !trustedOrigin) return Response.json({ ok: false }, { status: 403, headers });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) return Response.json({ ok: false, error: "Trop de demandes" }, { status: 429, headers });

  const body = request.headers.get("content-type")?.includes("application/json")
    ? await request.json().catch(() => ({}))
    : Object.fromEntries(await request.formData().catch(() => new FormData()));
  const parsed = siteFormSchema.safeParse(body);
  if (!parsed.success) return Response.json({ ok: false, error: "Formulaire invalide" }, { status: 400, headers });
  const v = parsed.data;

  // Honeypot filled → pretend success so bots don't retry.
  if (v.website) return Response.json({ ok: true }, { headers });

  const existing = await db.query.contacts.findFirst({ where: eq(contacts.email, v.email) });
  let contactId = existing?.id;
  if (!existing) {
    const firstStage = await db.query.pipelineStages.findFirst({ orderBy: asc(pipelineStages.position) });
    const [created] = await db
      .insert(contacts)
      .values({
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        phone: v.phone || null,
        source: "Site web",
        stageId: firstStage?.id ?? null,
        notes: v.message ? `Message du site : ${v.message}` : null,
      })
      .returning({ id: contacts.id });
    contactId = created.id;
  }

  await db.insert(tasks).values({
    title: existing ? `Nouveau message de ${v.firstName} via le site` : `Rappeler ${v.firstName} (formulaire du site)`,
    dueAt: new Date(),
    contactId,
  });
  await db.insert(activityLog).values({
    entity: "contact",
    entityId: contactId!,
    action: existing ? "site_form_message" : "created_from_site",
  });

  const thanks = process.env.SITE_FORM_THANKS_URL;
  if (wantsHtml && thanks) return Response.redirect(thanks, 303);
  return Response.json({ ok: true }, { headers });
}
