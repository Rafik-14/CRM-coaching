import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { activityLog } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { REPORT_FILENAME } from "@/server/revelateur/emails";
import { buildReportPdf } from "@/server/revelateur/report";

/** Builds the PDF and talks to the mail server: allow up to 60 s (the Hobby plan's maximum). */
export const maxDuration = 60;

/** The report PDF, for the coach only (same file as the one sent; rebuilt from the frozen result). */
export async function GET(_req: Request, ctx: RouteContext<"/test-signature/sessions/[id]/rapport">) {
  await requireCoach();
  const { id } = await ctx.params;
  const pdf = await buildReportPdf(id);
  if (!pdf) return new NextResponse("Rapport indisponible (passation non terminée ou contrôle éditorial non validé).", { status: 409 });
  await db.insert(activityLog).values({ entity: "revelateur_session", entityId: id, action: "report_downloaded" });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${REPORT_FILENAME}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
