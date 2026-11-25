import "server-only";

/**
 * The personalised PDF report (annexe 05). Built from the frozen result snapshot only; it never
 * recalculates. Not produced yet (interpretation engine, editorial library and PDF come next): until
 * then deliveries wait in « awaiting_report » and are sent automatically once this returns a file.
 */
export async function buildReportPdf(sessionId: string): Promise<Buffer | null> {
  void sessionId;
  return null;
}
