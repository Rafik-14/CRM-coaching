import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CalendarPlus, CircleCheck } from "lucide-react";
import { siteButton } from "@/components/site/button";
import { ArrowLink, ButtonLink, Container, GoldLine, Section } from "@/components/site/ui";
import { APP_TIME_ZONE } from "@/lib/format";
import { getBookedSession } from "@/server/booking";

export const metadata: Metadata = {
  title: "Échange stratégique réservé",
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

const NEXT_STEP: Record<string, string> = {
  Visio: "Je vous envoie le lien de la visio avant notre échange.",
  Téléphone: "Je vous appelle au numéro indiqué, à l’heure prévue.",
  Cabinet: "Je vous confirme l’adresse avant notre échange.",
};

export default function ConfirmationPage({ searchParams }: PageProps<"/reserver/confirmation">) {
  return (
    <Section className="pt-10 md:pt-16 lg:pt-20">
      <Container className="max-w-[860px]">
        <Suspense fallback={<div className="h-80 animate-pulse rounded-[12px] bg-ivory" />}>
          <Confirmation searchParams={searchParams} />
        </Suspense>
      </Container>
    </Section>
  );
}

async function Confirmation({ searchParams }: { searchParams: PageProps<"/reserver/confirmation">["searchParams"] }) {
  await connection();
  const r = (await searchParams).r;
  const token = Array.isArray(r) ? r[0] : r;
  const session = await getBookedSession(token);

  if (!session) {
    return (
      <div>
        <h1 className="jg-h2">Réservation introuvable</h1>
        <p className="mt-4">Ce lien n’est pas valide. Vous pouvez réserver un nouvel échange ou m’écrire.</p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <ButtonLink href="/reserver?source=confirmation">Réserver un échange stratégique</ButtonLink>
          <ButtonLink href="/contact" variant="secondary">
            Me contacter
          </ButtonLink>
        </div>
      </div>
    );
  }

  const cancelled = session.status !== "planned";
  return (
    <div>
      <CircleCheck aria-hidden className="size-10 text-[var(--jg-teal)]" strokeWidth={1.5} />
      <h1 className="jg-h1 mt-6">{cancelled ? "Cet échange a été annulé." : `Merci ${session.contact.firstName}, c’est réservé.`}</h1>
      <GoldLine className="mt-6" />
      <dl className="mt-8 grid gap-4 rounded-[12px] border border-[var(--jg-light-gray)] bg-ivory p-7 md:grid-cols-3 md:p-9">
        <div>
          <dt className="jg-small">Rendez-vous</dt>
          <dd className="mt-1 font-heading text-[1.125rem] font-semibold text-navy">Échange stratégique</dd>
        </div>
        <div>
          <dt className="jg-small">Date</dt>
          <dd className="mt-1 font-heading text-[1.125rem] font-semibold text-navy first-letter:uppercase">
            {whenFmt.format(session.startsAt)}
          </dd>
        </div>
        <div>
          <dt className="jg-small">Heure (Paris / Genève)</dt>
          <dd className="mt-1 font-heading text-[1.125rem] font-semibold text-navy">
            {timeFmt.format(session.startsAt)} · {session.durationMin} min{session.location ? ` · ${session.location}` : ""}
          </dd>
        </div>
      </dl>
      {!cancelled && (
        <>
          <p className="mt-8 max-w-[640px]">
            {NEXT_STEP[session.location ?? ""] ?? "Je vous confirme les détails avant notre échange."} Un empêchement ?{" "}
            <Link href="/contact?source=confirmation" className="font-semibold text-navy underline">
              Écrivez-moi
            </Link>
            .
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <a href={`/reserver/ics?r=${encodeURIComponent(token ?? "")}`} className={siteButton()}>
              <CalendarPlus aria-hidden />
              Ajouter à mon agenda
            </a>
            <ArrowLink href="/methode">En attendant, découvrir la Méthode JG®</ArrowLink>
          </div>
        </>
      )}
    </div>
  );
}
