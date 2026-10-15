import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ManageBooking } from "@/components/site/manage-booking";
import { ButtonLink, Container, Eyebrow, GoldLine, Section } from "@/components/site/ui";
import { APP_TIME_ZONE } from "@/lib/format";
import { getAvailability } from "@/server/booking";
import { getManagedBooking } from "@/server/manage-booking";

export const metadata: Metadata = {
  title: "Mon rendez-vous",
  robots: { index: false, follow: false },
};

const whenFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: APP_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit" });

/** Private page linked from the confirmation and reminder e-mails: see, move or cancel one appointment. */
export default function ManageBookingPage({ params, searchParams }: PageProps<"/rdv/[token]">) {
  return (
    <Section className="pt-10 md:pt-16 lg:pt-20">
      <Container className="max-w-[860px]">
        <Suspense fallback={<div className="h-80 animate-pulse rounded-[12px] bg-ivory" />}>
          <Manage params={params} searchParams={searchParams} />
        </Suspense>
      </Container>
    </Section>
  );
}

async function Manage({
  params,
  searchParams,
}: {
  params: PageProps<"/rdv/[token]">["params"];
  searchParams: PageProps<"/rdv/[token]">["searchParams"];
}) {
  await connection();
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const justBooked = sp.nouveau === "1";
  const booking = await getManagedBooking(token);

  if (!booking) {
    return (
      <div>
        <h1 className="jg-h2">Lien invalide ou expiré</h1>
        <p className="mt-4 max-w-[640px]">Ce lien ne permet plus de gérer un rendez-vous. Pour toute question, écrivez-moi.</p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <ButtonLink href="/contact?source=rdv">Me contacter</ButtonLink>
          <ButtonLink href="/reserver?source=rdv" variant="secondary">
            Réserver un échange stratégique
          </ButtonLink>
        </div>
      </div>
    );
  }

  const { session, config, canChange, isPast } = booking;
  const cancelled = session.status === "cancelled";
  const days =
    canChange ? (await getAvailability(new Date(), { durationMin: session.durationMin, excludeSessionId: session.id })).days : [];

  return (
    <div>
      <Eyebrow>{session.type}</Eyebrow>
      <GoldLine className="mt-4" />
      <h1 className="jg-h1 mt-6">
        {cancelled
          ? "Ce rendez-vous est annulé."
          : isPast
            ? "Ce rendez-vous est passé."
            : justBooked
              ? `Merci ${session.contact.firstName}, c’est réservé.`
              : `Bonjour ${session.contact.firstName},`}
      </h1>
      {!cancelled && !isPast && (
        <p className="mt-4 font-heading text-[1.25rem] leading-snug font-medium text-navy">
          {justBooked ? "Vous recevez une confirmation par e-mail, avec le rendez-vous pour votre agenda." : "Voici votre rendez-vous."}
        </p>
      )}

      <dl
        className={`mt-8 grid gap-4 rounded-[12px] border border-[var(--jg-light-gray)] bg-ivory p-7 md:grid-cols-3 md:p-9 ${cancelled ? "opacity-60" : ""}`}
      >
        <div>
          <dt className="jg-small">Date</dt>
          <dd className={`mt-1 font-heading text-[1.125rem] font-semibold text-navy first-letter:uppercase ${cancelled ? "line-through" : ""}`}>
            {whenFmt.format(session.startsAt)}
          </dd>
        </div>
        <div>
          <dt className="jg-small">Heure (Paris / Genève)</dt>
          <dd className="mt-1 font-heading text-[1.125rem] font-semibold text-navy">
            {timeFmt.format(session.startsAt)} · {session.durationMin} min
          </dd>
        </div>
        <div>
          <dt className="jg-small">Lieu</dt>
          <dd className="mt-1 font-heading text-[1.125rem] font-semibold text-navy">{session.location ?? "À confirmer"}</dd>
        </div>
      </dl>

      <div className="mt-10">
        {cancelled ? (
          <ButtonLink href="/reserver?source=rdv-annule">Réserver un nouveau rendez-vous</ButtonLink>
        ) : isPast || session.status !== "planned" ? (
          <ButtonLink href="/contact?source=rdv" variant="secondary">
            Me contacter
          </ButtonLink>
        ) : canChange ? (
          <>
            <p className="mb-6 max-w-[640px]">
              Un empêchement ? Vous pouvez déplacer ou annuler ce rendez-vous ici jusqu’à {`${config.cancellationHours} h`} avant.
            </p>
            <ManageBooking token={token} days={days} durationMin={session.durationMin} location={session.location} />
          </>
        ) : (
          <p className="max-w-[640px]">
            Le rendez-vous a lieu dans moins de {`${config.cancellationHours} h`} : il ne peut plus être modifié en ligne. Un imprévu ?
            Répondez simplement à l’e-mail reçu ou{" "}
            <Link href="/contact?source=rdv" className="font-semibold text-navy underline">
              écrivez-moi
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
