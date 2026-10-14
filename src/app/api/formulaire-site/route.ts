import { siteFormSchema } from "@/lib/validations/phase1";
import { rateLimited } from "@/server/rate-limit";
import { recordSiteMessage } from "@/server/site-leads";

/**
 * Contact form of an external website → new lead in the CRM.
 * (The public site in this project uses a server action with the same logic: src/server/actions/site.ts.)
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
  if (rateLimited(`api:${ip}`)) return Response.json({ ok: false, error: "Trop de demandes" }, { status: 429, headers });

  const body = request.headers.get("content-type")?.includes("application/json")
    ? await request.json().catch(() => ({}))
    : Object.fromEntries(await request.formData().catch(() => new FormData()));
  const parsed = siteFormSchema.safeParse(body);
  if (!parsed.success) return Response.json({ ok: false, error: "Formulaire invalide" }, { status: 400, headers });
  const v = parsed.data;

  // Honeypot filled → pretend success so bots don't retry.
  if (v.website) return Response.json({ ok: true }, { headers });

  await recordSiteMessage(
    { firstName: v.firstName, lastName: v.lastName, email: v.email, phone: v.phone, segment: v.segment, cta: v.cta },
    v.message,
  );

  const thanks = process.env.SITE_FORM_THANKS_URL;
  if (wantsHtml && thanks) return Response.redirect(thanks, 303);
  return Response.json({ ok: true }, { headers });
}
