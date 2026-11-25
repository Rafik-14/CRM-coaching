import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CinemaLanding } from "@/components/revelateur/cinema/landing";
import { db } from "@/server/db";
import { revelateurEnabled } from "@/server/revelateur/flag";
import { INTRO_LINES, OWNERSHIP_NOTICE, WELCOME_TEXT } from "@/server/revelateur/questionnaire";
import { findSession, screenFor } from "@/server/revelateur/session";

export const metadata: Metadata = {
  title: "Le Révélateur — Test Signature JG®",
  robots: { index: false, follow: false },
};

/** Start page of the test: full-screen logo reveal, overture, validated welcome texts, start / resume. */
export default function RevelateurPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <Landing />
    </Suspense>
  );
}

async function Landing() {
  await connection();
  if (!revelateurEnabled()) notFound();
  // Same device, unfinished passation: offer « Reprendre (n/30) ».
  const session = await findSession(db, (await cookies()).get("jg_revelateur")?.value);
  let saved = 0;
  if (session?.status === "in_progress") {
    const s = await screenFor(db, session);
    saved = s.kind === "question" ? s.answered.filter(Boolean).length : s.kind === "open" || s.kind === "recap" ? 30 : 0;
  }
  return <CinemaLanding savedCount={saved} texts={{ intro: INTRO_LINES, welcome: WELCOME_TEXT, ownership: OWNERSHIP_NOTICE }} />;
}
