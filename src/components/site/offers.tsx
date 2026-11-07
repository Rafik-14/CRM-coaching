import { connection } from "next/server";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getPublicOffers, type PublicOffer } from "@/server/queries/site";
import { offerColor, offerSlug } from "./content";
import { bookingHref } from "./nav";
import { ButtonLink } from "./ui";

/** Length of every session, shown after the number of sessions (« 1 séance de 75 min »). */
const SESSION_LENGTH = "75 min";

/** « 160 € / 180 CHF · 1 séance de 75 min » */
export function priceLine(offer: Pick<PublicOffer, "priceEur" | "priceChf" | "sessionsCount">, withSessions = true) {
  const prices = [formatMoney(offer.priceEur, "EUR"), offer.priceChf != null && formatMoney(offer.priceChf, "CHF")]
    .filter(Boolean)
    .join(" / ");
  if (!withSessions) return prices;
  // No-break spaces keep « · 3 séances » together when the line wraps.
  return `${prices} · ${offer.sessionsCount} séance${offer.sessionsCount > 1 ? "s" : ""} de ${SESSION_LENGTH}`;
}

/** « Inclus » list: the offer's « includes » from the CRM. */
const INCLUDES = Symbol("includes");

/**
 * Site wording that is not stored in the CRM (kind of offer, who it is for, button), keyed by offer anchor
 * (« MODIFICATIONS 3.0 », onglet Accompagnements, Nov. 2026).
 */
const EXTRAS: Record<
  string,
  { kind: string; lists: { label: string; items: readonly string[] | typeof INCLUDES }[]; sessions?: string; cta: string; href: string }
> = {
  "focus-decisif": {
    kind: "Intervention ciblée",
    lists: [
      {
        label: "Pour :",
        items: [
          "Préparation d’entretien",
          "Recrutement et sélection",
          "Négociation",
          "Présentation professionnelle",
          "Prise de parole",
          "Situation professionnelle ponctuelle",
        ],
      },
    ],
    cta: "Préparer mon moment décisif",
    href: bookingHref("offre-focus-decisif", "particulier"),
  },
  "architecture-identitaire": {
    kind: "Construction identitaire",
    lists: [
      {
        label: "Pour :",
        items: [
          "Clarification de l’identité professionnelle",
          "Repositionnement",
          "Évolution professionnelle",
          "Reconversion",
          "Identification des forces distinctives",
          "Construction d’un positionnement professionnel",
        ],
      },
    ],
    cta: "Découvrir ce qui me distingue",
    href: bookingHref("offre-architecture-identitaire", "particulier"),
  },
  "parcours-signature": {
    kind: "Transformation approfondie",
    lists: [{ label: "Inclus :", items: INCLUDES }],
    sessions: "séances individuelles",
    cta: "Construire mon parcours signature",
    href: "/accompagnements/parcours-signature",
  },
};

/** Each formula has its own colour: top band, light tint, number, name and a button filled in that colour (Jérémy, 3.0). */
const OFFER_BUTTON = "border-[var(--offer)] bg-[var(--offer)] text-white hover:border-navy hover:bg-navy";

/** The offers from the CRM (prices included), as comparison cards side by side on large screens. */
export async function OfferList() {
  await connection();
  const offers = await getPublicOffers();
  return (
    <ol className="grid gap-10 pt-3 lg:grid-cols-3 lg:items-stretch lg:gap-6">
      {offers.map((offer, i) => {
        const slug = offerSlug(offer.name);
        const extra = EXTRAS[slug];
        const lists = (extra?.lists ?? [{ label: "Inclus :", items: INCLUDES }])
          .map((list) => ({ label: list.label, items: list.items === INCLUDES ? offer.includes : list.items }))
          .filter((list) => list.items.length > 0);
        const sessions = `${offer.sessionsCount} ${offer.sessionsCount > 1 ? "séances" : "séance"}`;
        return (
          <li
            key={offer.id}
            id={slug}
            style={{ "--offer": offerColor(slug) } as React.CSSProperties}
            className="relative flex scroll-mt-28 flex-col rounded-b-[12px] border border-t-[6px] border-[color-mix(in_srgb,var(--offer)_35%,white)] border-t-[var(--offer)] bg-[color-mix(in_srgb,var(--offer)_5%,white)] p-7 transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(23,37,54,0.12)] motion-reduce:hover:translate-y-0 md:p-8"
          >
            <h2 className="font-heading text-[1.0625rem] leading-snug font-semibold tracking-[0.04em] text-[var(--offer)] uppercase">
              <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span> — {offer.name}
            </h2>
            {extra?.kind && (
              <p className="mt-1 text-[15px] font-semibold text-navy">
                {extra.kind} · {sessions}
              </p>
            )}
            {offer.tagline && <p className="mt-3 font-heading leading-snug font-medium text-navy lg:min-h-[3em]">{offer.tagline}</p>}
            <p className="mt-6 font-heading text-[2.25rem] leading-none font-semibold text-navy tabular-nums">
              {formatMoney(offer.priceEur, "EUR")}
            </p>
            <p className="mt-2 text-[15px] text-muted-foreground">
              {offer.priceChf != null && <>{formatMoney(offer.priceChf, "CHF")} · </>}
              {extra?.sessions ? `${offer.sessionsCount} ${extra.sessions}` : `${sessions} de ${SESSION_LENGTH}`}
            </p>
            {lists.map((list) => (
              <div key={list.label} className="mt-6">
                <p className="font-semibold text-navy">{list.label}</p>
                <ul className="mt-2 grid gap-y-1.5 text-[15px]">
                  {list.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check aria-hidden className="mt-1 size-4 shrink-0 text-[var(--offer)]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {offer.description && (
              <details className="group mt-6">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[15px] font-semibold text-navy underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
                  <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
                  En détail
                </summary>
                <p className="mt-3 text-[15px]">{offer.description}</p>
              </details>
            )}
            <div className="mt-auto pt-7">
              <ButtonLink href={extra?.href ?? bookingHref(`offre-${slug}`)} variant="primary" block className={OFFER_BUTTON}>
                {extra?.cta ?? "Réserver un échange stratégique"}
                <ArrowRight aria-hidden />
              </ButtonLink>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function OfferListSkeleton() {
  return (
    <div className="grid gap-6 pt-3 lg:grid-cols-3" aria-busy>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[560px] animate-pulse rounded-[12px] border border-[var(--jg-light-gray)] bg-white" />
      ))}
    </div>
  );
}

/** Price of one offer (e.g. Parcours Signature page), from the CRM. */
export async function OfferPrice({ slug, className }: { slug: string; className?: string }) {
  await connection();
  const offer = (await getPublicOffers()).find((o) => offerSlug(o.name) === slug);
  if (!offer) return null;
  return <p className={cn("font-heading text-[1.5rem] font-semibold text-navy", className)}>{priceLine(offer, false)}</p>;
}
