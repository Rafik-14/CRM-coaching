import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CinemaExperience } from "@/components/revelateur/cinema/experience";
import { SCALE_LABELS } from "@/lib/revelateur/scoring";
import { db } from "@/server/db";
import { revelateurEnabled } from "@/server/revelateur/flag";
import { CALLBACK_CONSENT } from "@/server/revelateur/crm";
import { deliveryOf, stateOf } from "@/server/revelateur/delivery";
import { END_TEXT, OPEN_QUESTION, OWNERSHIP_NOTICE, PREPARATION_TEXT, SAVE_NOTICE } from "@/server/revelateur/questionnaire";
import { findSession } from "@/server/revelateur/session";

/** Builds the PDF and talks to the mail server: allow up to 60 s (the Hobby plan's maximum). */
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Le Révélateur — Test Signature JG®",
  robots: { index: false, follow: false },
};

export default function ExperiencePage({ searchParams }: { searchParams: Promise<{ depuis?: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <Experience searchParams={searchParams} />
    </Suspense>
  );
}

async function Experience({ searchParams }: { searchParams: Promise<{ depuis?: string }> }) {
  await connection();
  if (!revelateurEnabled()) notFound();
  const session = await findSession(db, (await cookies()).get("jg_revelateur")?.value);
  const delivery = session?.status === "complete" ? stateOf(await deliveryOf(db, session.id)) : ({ status: "none" } as const);
  return (
    <CinemaExperience
      initialComplete={session?.status === "complete"}
      initialDelivery={delivery}
      fromStart={(await searchParams).depuis === "debut"}
      texts={{ openQuestion: OPEN_QUESTION, saveNotice: SAVE_NOTICE, preparation: PREPARATION_TEXT, scale: SCALE_LABELS, ownership: OWNERSHIP_NOTICE, end: END_TEXT, callback: CALLBACK_CONSENT.text }}
    />
  );
}
