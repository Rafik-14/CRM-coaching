import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { invoices } from "@/server/db/schema";
import { getCurrentUser } from "@/server/dal";
import { invoicePdf } from "@/server/billing";
import { readStoredFile } from "@/server/storage";

/** Invoice PDF for the coach: the stored file once issued, rendered on the fly for a draft. */
export async function GET(request: Request, ctx: RouteContext<"/api/factures/[id]/pdf">) {
  const user = await getCurrentUser();
  if (!user || user.role !== "coach") return new Response("Non autorisé", { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Introuvable", { status: 404 });
  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, id) });
  if (!inv) return new Response("Introuvable", { status: 404 });

  let data: Buffer;
  try {
    data = inv.pdfPath ? await readStoredFile(inv.pdfPath) : await invoicePdf(inv);
  } catch {
    data = await invoicePdf(inv);
  }
  const name = `${inv.kind === "credit_note" ? "avoir" : "facture"}-${inv.number ?? "brouillon"}.pdf`;
  const download = new URL(request.url).searchParams.has("telecharger");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
