import { renderToBuffer } from "@react-pdf/renderer";
import { bookingHref } from "@/components/site/nav";
import type { ScoringResult } from "@/lib/revelateur/scoring";
import { composeReport, type ReportContent } from "./editorial";
import type { Interpretation } from "./interpretation";
import { ReportDocument } from "./report-document";

/** Base URL of the public site for the report's booking button (never the staging address in production). */
const siteUrl = () => (process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100").replace(/\/$/, "");

/** Composes the texts, runs the editorial control, then lays out the PDF (null if the control fails). */
export async function renderReportPdf(input: {
  result: ScoringResult;
  interpretation: Interpretation;
  firstName: string | null;
  openAnswer: string | null;
  confirmedAt: Date;
  /** Ownership notice (v2.0 §5), printed on every page. */
  ownership: string;
}): Promise<{ pdf: Buffer | null; content: ReportContent }> {
  const content = composeReport({
    result: input.result,
    interpretation: input.interpretation,
    firstName: input.firstName,
    openAnswer: input.openAnswer,
    bookingUrl: `${siteUrl()}${bookingHref("test-signature-jg")}`,
  });
  if (!content.qc.ok) return { pdf: null, content };
  const date = input.confirmedAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
  const pdf = await renderToBuffer(ReportDocument({ content, ownership: input.ownership, date }));
  return { pdf, content };
}
