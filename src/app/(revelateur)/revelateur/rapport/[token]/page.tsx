import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CinemaHUD } from "@/components/revelateur/cinema/hud";
import { ReportStep } from "@/components/revelateur/cinema/report-step";
import { db } from "@/server/db";
import { CALLBACK_CONSENT } from "@/server/revelateur/crm";
import { deliveryOf, stateOf, verifyDelivery } from "@/server/revelateur/delivery";
import { revelateurEnabled } from "@/server/revelateur/flag";
import { END_TEXT, OWNERSHIP_NOTICE } from "@/server/revelateur/questionnaire";
import { runDelivery } from "@/server/revelateur/send-delivery";

export const metadata: Metadata = {
  title: "Votre rapport — Test Signature JG®",
  robots: { index: false, follow: false },
};

/** The link of the address-confirmation e-mail: confirms the address, then sends the report. */
export default function ReportLinkPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <span className="font-film text-[10.5px] tracking-[0.3em] text-[#D4A866]/80 uppercase">Votre rapport se prépare…</span>
        </div>
      }
    >
      <Confirm params={params} />
    </Suspense>
  );
}

async function Confirm({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  if (!revelateurEnabled()) notFound();
  const v = await verifyDelivery(db, (await params).token);

  let body: React.ReactNode;
  if (!v.ok) {
    body = (
      <div className="mx-auto max-w-xl text-center">
        <p className="font-film text-[10.5px] tracking-[0.26em] text-[#D4A866] uppercase">Lien {v.reason === "expired" ? "expiré" : "invalide"}</p>
        <h1 className="mt-4 font-display text-[30px] font-extralight tracking-[-0.02em] text-[#F8F6F2] sm:text-[38px]">
          {v.reason === "expired" ? "Ce lien n'est plus valable." : "Ce lien n'est pas reconnu."}
        </h1>
        <p className="mt-5 text-[15.5px] leading-[1.75] font-light text-[#F8F6F2]/80">
          Sur l&apos;appareil où vous avez répondu au test, vous pouvez demander un nouveau lien. Vos réponses confirmées sont conservées.
        </p>
        <Link href="/revelateur/experience" className="font-film mt-8 inline-block text-[10.5px] tracking-[0.2em] text-[#E2C08A] uppercase hover:text-[#F8F6F2]">
          Demander un nouveau lien
        </Link>
      </div>
    );
  } else {
    // Send right away when possible; otherwise the scheduled job keeps trying (same PDF, no recalculation).
    if (v.delivery.status === "awaiting_report" || v.delivery.status === "failed") await runDelivery(v.delivery.id);
    const state = stateOf(await deliveryOf(db, v.delivery.sessionId));
    body = <ReportStep initial={state} end={END_TEXT} callbackText={CALLBACK_CONSENT.text} />;
  }

  return (
    <>
      <CinemaHUD />
      <section className="flex min-h-[100dvh] flex-col items-center justify-between px-6 pt-28 pb-10">
        <div className="my-auto w-full">{body}</div>
        <p className="mt-12 max-w-2xl text-center text-[11px] leading-[1.6] font-light text-[#F8F6F2]/45">{OWNERSHIP_NOTICE}</p>
      </section>
    </>
  );
}
