import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { RevelateurStory } from "@/components/revelateur/story";
import { SiteTheme } from "@/components/site/site-theme";
import { revelateurEnabled } from "@/server/revelateur/flag";
import { INTRO_LINES, OWNERSHIP_NOTICE, WELCOME_TEXT } from "@/server/revelateur/questionnaire";

export const metadata: Metadata = {
  title: "Le Révélateur — Test Signature JG®",
  robots: { index: false, follow: false },
};

/**
 * The story page of the test: Jérémy's story, the test explained, and the start. Immersive, without
 * the site menu. Replaces the provisional presentation page.
 */
export default function RevelateurPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#172536]" />}>
      <Story />
    </Suspense>
  );
}

async function Story() {
  await connection();
  if (!revelateurEnabled()) notFound();
  return (
    <div className="jg-site min-h-dvh bg-[var(--jg-ivory)] text-[var(--jg-anthracite)]">
      <SiteTheme />
      <main id="contenu">
        <RevelateurStory texts={{ intro: INTRO_LINES, welcome: WELCOME_TEXT, ownership: OWNERSHIP_NOTICE }} />
      </main>
    </div>
  );
}
