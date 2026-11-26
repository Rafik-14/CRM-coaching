import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { activityLog } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { computeStats } from "@/server/revelateur/stats";
import { statsToPdf, statsToXlsx } from "@/server/revelateur/stats-export";
import { PERIODS, periodStart } from "../labels";

/** Statistics export (v2.0 §8: XLSX and PDF), aggregated only. Coach only; each export is logged. */
export async function GET(req: Request) {
  const user = await requireCoach();
  const url = new URL(req.url);
  const period = PERIODS.find((p) => p.key === url.searchParams.get("periode")) ?? PERIODS[0];
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
  const stats = await computeStats(db, period.label, periodStart(period.days));
  await db.insert(activityLog).values({ actorId: user.id, entity: "revelateur_stats", entityId: user.id, action: `export_${format}` });
  const day = new Date().toISOString().slice(0, 10);
  const file = format === "pdf" ? await statsToPdf(stats) : await statsToXlsx(stats);
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Revelateur-statistiques-${day}.${format}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
