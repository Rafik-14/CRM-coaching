import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { CalendarPlus, CircleCheck, Hourglass } from "lucide-react";
import { CancelRegistrationButton } from "@/components/site/event-registration";
import { eventDay, eventHours, kindLabel } from "@/components/site/event-card";
import { ArrowLink, ButtonLink, Container, Eyebrow, GoldLine, Section } from "@/components/site/ui";
import { getRegistrationByToken } from "@/server/queries/events";

export const metadata: Metadata = { title: "Mon inscription", robots: { index: false, follow: false } };

/** Private page linked from the event e-mails: see the booking, add it to the agenda, cancel. */
export default function RegistrationPage({ params, searchParams }: PageProps<"/inscription/[token]">) {
  return (
    <Section className="pt-10 md:pt-16 lg:pt-20">
      <Container className="max-w-[860px]">
        <Suspense fallback={<div className="h-80 animate-pulse rounded-[12px] bg-ivory" />}>
          <Registration params={params} searchParams={searchParams} />
        </Suspense>
      </Container>
    </Section>
  );
}

async function Registration({
  params,
  searchParams,
}: {
  params: PageProps<"/inscription/[token]">["params"];
  searchParams: PageProps<"/inscription/[token]">["searchParams"];
}) {
  await connection();
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const reg = await getRegistrationByToken(token);

  if (!reg) {
    return (
      <div>
        <h1 className="jg-h2">Lien invalide ou expiré</h1>
        <p className="mt-4 max-w-[640px]">Ce lien ne permet plus de voir une inscription. Pour toute question, écrivez-moi.</p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <ButtonLink href="/evenements">Voir les événements</ButtonLink>
          <ButtonLink href="/contact?source=inscription" variant="secondary">
            Me contacter
          </ButtonLink>
        </div>
      </div>
    );
  }

  const ev = reg.event;
  const now = new Date();
  const justRegistered = sp.nouveau === "1";
  const started = ev.startsAt <= now;
  const eventCancelled = ev.status === "cancelled";
  const place = ev.location ?? (ev.onlineUrl ? "En ligne" : null);

  const heading = eventCancelled
    ? "Cet événement est annulé"
    : reg.status === "cancelled"
      ? "Votre inscription est annulée"
      : reg.status === "waitlist"
        ? justRegistered
          ? `Merci ${reg.firstName}, vous êtes sur la liste d’attente.`
          : "Vous êtes sur la liste d’attente"
        : justRegistered
          ? `Merci ${reg.firstName}, votre place est réservée.`
          : "Votre inscription est confirmée";

  return (
    <div>
      <Eyebrow>{kindLabel(ev.kind)}</Eyebrow>
      <GoldLine className="mt-4" />
      <div className="mt-6 flex items-start gap-3">
        {reg.status === "confirmed" && !eventCancelled && <CircleCheck aria-hidden className="mt-1 size-8 shrink-0 text-[var(--jg-teal)]" strokeWidth={1.75} />}
        {reg.status === "waitlist" && !eventCancelled && <Hourglass aria-hidden className="mt-1 size-8 shrink-0 text-gold" strokeWidth={1.75} />}
        <h1 className="jg-h2">{heading}</h1>
      </div>
      {justRegistered && reg.status !== "cancelled" && (
        <p className="mt-4 max-w-[640px]">
          {reg.status === "waitlist"
            ? "Si une place se libère, elle vous est attribuée automatiquement et vous recevez un e-mail."
            : "Un e-mail de confirmation vient de vous être envoyé, avec l’événement à ajouter à votre agenda."}
        </p>
      )}

      <dl className="mt-8 grid gap-4 rounded-[12px] border border-[var(--jg-light-gray)] bg-ivory p-6 sm:grid-cols-2 md:p-8">
        <Item label="Événement">{ev.title}</Item>
        <Item label="Date">{eventDay(ev.startsAt)}</Item>
        <Item label="Heure (Paris / Genève)">{eventHours(ev.startsAt, ev.endsAt)}</Item>
        {place && <Item label="Lieu">{place}</Item>}
        {reg.status === "confirmed" && ev.onlineUrl && !eventCancelled && (
          <Item label="Lien de connexion">
            <a href={ev.onlineUrl} className="break-all text-navy underline decoration-gold decoration-2 underline-offset-4">
              {ev.onlineUrl}
            </a>
          </Item>
        )}
        <Item label="Places">{String(reg.seats)}</Item>
        <Item label="Au nom de">{`${reg.firstName} ${reg.lastName}`.trim()}</Item>
      </dl>

      {!eventCancelled && reg.status !== "cancelled" && !started && (
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-start">
          {reg.status === "confirmed" && (
            <ButtonLink href={`/inscription/${token}/agenda`} prefetch={false}>
              <CalendarPlus aria-hidden /> Ajouter à mon agenda
            </ButtonLink>
          )}
          <CancelRegistrationButton token={token} />
        </div>
      )}

      <div className="mt-10 flex flex-col gap-3">
        <ArrowLink href={`/evenements/${ev.slug}`}>Voir la page de l’événement</ArrowLink>
        <ArrowLink href="/evenements">Tous les événements</ArrowLink>
      </div>
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="jg-small">{label}</dt>
      <dd className="mt-1 font-heading text-[1.0625rem] font-semibold text-navy">{children}</dd>
    </div>
  );
}
