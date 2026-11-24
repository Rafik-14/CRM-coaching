import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { RevelateurExperience } from "@/components/revelateur/experience";
import { SCALE_LABELS } from "@/lib/revelateur/scoring";
import { db } from "@/server/db";
import { revelateurEnabled } from "@/server/revelateur/flag";
import { OPEN_QUESTION, OWNERSHIP_NOTICE, PREPARATION_TEXT, SAVE_NOTICE, WELCOME_TEXT } from "@/server/revelateur/questionnaire";
import { findSession, screenFor } from "@/server/revelateur/session";

export const metadata: Metadata = {
  title: "Le Révélateur — Test Signature JG®",
  robots: { index: false, follow: false },
};

// The fallback is navy, so the story page's closed curtain never flashes white before ours.
export default function ExperiencePage() {
  return (
    <Suspense fallback={<div className="rv-curtain" aria-hidden><span>Le Révélateur</span></div>}>
      <Experience />
    </Suspense>
  );
}

async function Experience() {
  await connection();
  if (!revelateurEnabled()) notFound();

  // Same device: resume the unfinished passation (30 days). A new visitor starts with the immersion.
  const session = await findSession(db, (await cookies()).get("jg_revelateur")?.value);
  const initial = session ? await screenFor(db, session) : null;

  return (
    <RevelateurExperience
      initial={initial}
      resumed={!!session && session.status === "in_progress" && session.step !== "welcome"}
      texts={{
        welcome: WELCOME_TEXT,
        openQuestion: OPEN_QUESTION,
        saveNotice: SAVE_NOTICE,
        preparation: PREPARATION_TEXT,
        scale: SCALE_LABELS,
        ownership: OWNERSHIP_NOTICE,
      }}
    />
  );
}
