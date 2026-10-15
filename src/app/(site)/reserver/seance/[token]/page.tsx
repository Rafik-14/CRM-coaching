import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ClientBookingWidget } from "@/components/site/client-booking-widget";
import { ButtonLink, Container, Eyebrow, GoldLine, Section } from "@/components/site/ui";
import { getAvailability, getBookingSettings } from "@/server/booking";
import { resolveClientBooking } from "@/server/client-booking";

export const metadata: Metadata = {
  title: "Réserver une séance",
  robots: { index: false, follow: false },
};

/** Personal booking link of an existing client (sent from the client file). */
export default function ClientBookingPage({ params }: PageProps<"/reserver/seance/[token]">) {
  return (
    <Section className="pt-10 md:pt-16 lg:pt-20">
      <Container className="max-w-[960px]">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-[12px] bg-ivory" />}>
          <ClientBooking params={params} />
        </Suspense>
      </Container>
    </Section>
  );
}

async function ClientBooking({ params }: { params: PageProps<"/reserver/seance/[token]">["params"] }) {
  await connection();
  const { token } = await params;
  const booking = await resolveClientBooking(token);

  if (!booking?.active) {
    return (
      <div>
        <h1 className="jg-h2">Ce lien n’est plus actif</h1>
        <p className="mt-4 max-w-[640px]">
          Pour convenir d’un rendez-vous, écrivez-moi : je vous réponds rapidement.
        </p>
        <div className="mt-8">
          <ButtonLink href="/contact?source=lien-client">Me contacter</ButtonLink>
        </div>
      </div>
    );
  }

  const { sessionMinutes } = await getBookingSettings();
  const { config, days } = await getAvailability(new Date(), { durationMin: sessionMinutes });

  return (
    <div>
      <Eyebrow>Séance individuelle</Eyebrow>
      <GoldLine className="mt-4" />
      <h1 className="jg-h1 mt-6">Bonjour {booking.contact.firstName},</h1>
      <p className="mt-4 font-heading text-[1.25rem] leading-snug font-medium text-navy">
        Choisissez le créneau de votre prochaine séance.
      </p>
      <div className="mt-10 rounded-[12px] border border-[var(--jg-light-gray)] bg-ivory p-6 md:p-10">
        {days.length ? (
          <ClientBookingWidget token={token} days={days} durationMin={sessionMinutes} location={config.location} />
        ) : (
          <p>
            Aucun créneau n’est libre pour le moment.{" "}
            <Link href="/contact?source=lien-client" className="font-semibold text-navy underline">
              Écrivez-moi
            </Link>{" "}
            : je vous propose un horaire.
          </p>
        )}
      </div>
    </div>
  );
}
