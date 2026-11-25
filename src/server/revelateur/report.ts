import "server-only";
import { eq } from "drizzle-orm";
import type { RawAnswers } from "@/lib/revelateur/scoring";
import { db } from "@/server/db";
import { revelateurAnswers, revelateurDeliveries, revelateurResults, revelateurSessions } from "@/server/db/schema";
import { interpret } from "./interpretation";
import { OWNERSHIP_NOTICE } from "./questionnaire";
import { renderReportPdf } from "./report-render";

/**
 * The personalised PDF report (annexe 05), built from the frozen result snapshot and the stored
 * interpretation only: nothing is recalculated, so a re-send gives the same report (v2.0 §4). It is not
 * stored; it is rebuilt identically when (re)sent. If the editorial control fails, nothing is sent
 * (v2.0 §2 step 8: « en cas d'anomalie, bloquer l'envoi automatique »).
 */
export async function buildReportPdf(sessionId: string): Promise<Buffer | null> {
  const [result, session, delivery] = await Promise.all([
    db.query.revelateurResults.findFirst({ where: eq(revelateurResults.sessionId, sessionId) }),
    db.query.revelateurSessions.findFirst({ where: eq(revelateurSessions.id, sessionId) }),
    db.query.revelateurDeliveries.findFirst({ where: eq(revelateurDeliveries.sessionId, sessionId) }),
  ]);
  if (!result || !session || session.status !== "complete") return null;

  // Passations confirmed before the engine existed: interpret the frozen answers once (deterministic).
  let interpretation = result.interpretation;
  if (!interpretation) {
    const rows = await db.select().from(revelateurAnswers).where(eq(revelateurAnswers.sessionId, sessionId));
    const answers = Object.fromEntries(rows.map((r) => [r.questionId, r.rawValue])) as RawAnswers;
    interpretation = interpret(answers, result.snapshot, session.openAnswer);
    await db
      .update(revelateurResults)
      .set({ interpretation, interpretationEngineVersion: interpretation.meta.interpretationEngineVersion })
      .where(eq(revelateurResults.id, result.id));
  }

  const out = await renderReportPdf({
    result: result.snapshot,
    interpretation,
    firstName: delivery?.firstName ?? null,
    openAnswer: session.openAnswer,
    confirmedAt: session.confirmedAt ?? result.createdAt,
    ownership: OWNERSHIP_NOTICE,
  });
  if (!out.pdf) console.warn(`[revelateur] report blocked by the editorial control (${out.content.qc.issues.length} issue(s))`);
  return out.pdf;
}
