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
 * Site wording that is not stored in the CRM (who the offer is for, button), keyed by offer anchor
 * (« MODIFICATIONS 2.2 », onglet Accompagnements, Nov. 2026).
 */
const EXTRAS: Record<
  string,
  { lists: { label: string; items: readonly string[] | typeof INCLUDES }[]; sessions?: string; cta: string; href: string; secondary?: boolean }
> = {
  "architecture-identitaire": {
    lists: [{ label: "Pour :", items: ["Clarification", "Repositionnement", "Orientation", "Reconversion", "Évolution professionnelle"] }],
    cta: "Clarifier ma valeur",
    href: bookingHref("offre-architecture-identitaire", "particulier"),
  },
  "accompagnement-decisif": {
    lists: [
      {
        label: "Pour :",
        items: ["Entretiens & recrutement", "Mobilité professionnelle", "Négociation", "Prise de parole", "Leadership"],
      },
    ],
    cta: "Préparer mon moment décisif",
    href: bookingHref("offre-accompagnement-decisif", "particulier"),
  },
  "parcours-signature": {
    lists: [
      { label: "Inclus :", items: INCLUDES },
      {
        label: "Pour :",
        items: [
          "Transformation professionnelle",
          "Repositionnement stratégique",
          "Leadership",
          "Évolution de carrière",
          "Affirmation de son identité",
        ],
      },
    ],
    sessions: "séances individuelles",
    cta: "Construire mon parcours Signature",
    href: "/accompagnements/parcours-signature",
    secondary: true,
  },
};

/** Buttons in each formula's colour, like its name and top line (Jérémy, V4). */
const OFFER_FILLED = "border-[var(--offer)] bg-[var(--offer)] text-white hover:border-navy hover:bg-navy";
const OFFER_OUTLINE = "border-[var(--offer)] text-[var(--offer)] hover:bg-[var(--offer)] hover:text-white";

/** The offer set apart in solid navy, with its badge. To be confirmed by Jérémy (or set to null for none). */
const FEATURED: { slug: string; badge: string } | null = { slug: "accompagnement-decisif", badge: "Le plus choisi" };

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
        const featured = FEATURED?.slug === slug;
        return (
          <li
            key={offer.id}
            id={slug}
            style={{ "--offer": offerColor(slug) } as React.CSSProperties}
            className={cn(
              "relative flex scroll-mt-28 flex-col rounded-b-[12px] border border-t-4 p-7 transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(23,37,54,0.12)] motion-reduce:hover:translate-y-0 md:p-8",
              featured
                ? "jg-on-navy border-navy border-t-gold bg-navy text-white"
                : "border-[var(--jg-light-gray)] border-t-[var(--offer)] bg-white",
            )}
          >
            {featured && (
              <p className="absolute -top-4 left-7 rounded-[4px] bg-gold px-3 py-1 font-heading text-[12px] font-semibold tracking-[0.06em] text-navy md:left-8">
                {FEATURED.badge}
              </p>
            )}
            <p className={cn("font-heading text-[15px] font-semibold tabular-nums", featured ? "text-gold" : "text-[var(--offer)]")}>
              {String(i + 1).padStart(2, "0")}
            </p>
            <h2
              className={cn(
                "mt-3 font-heading text-[1.0625rem] leading-snug font-semibold tracking-[0.04em] uppercase",
                featured ? "text-white" : "text-[var(--offer)]",
              )}
            >
              {offer.name}
            </h2>
            {offer.tagline && (
              <p className={cn("mt-2 font-heading leading-snug font-medium lg:min-h-[3em]", featured ? "text-gold" : "text-navy")}>
                {offer.tagline}
              </p>
            )}
            <p className={cn("mt-6 font-heading text-[2.25rem] leading-none font-semibold tabular-nums", featured ? "text-gold" : "text-navy")}>
              {formatMoney(offer.priceEur, "EUR")}
            </p>
            <p className={cn("mt-2 text-[15px]", featured ? "text-white/85" : "text-muted-foreground")}>
              {offer.priceChf != null && <>{formatMoney(offer.priceChf, "CHF")} · </>}
              {offer.sessionsCount} {extra?.sessions ?? (offer.sessionsCount > 1 ? "séances" : "séance")} de {SESSION_LENGTH}
            </p>
            {lists.map((list) => (
              <div key={list.label} className="mt-6">
                <p className={cn("font-semibold", featured ? "text-white" : "text-navy")}>{list.label}</p>
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[15px]">
                  {list.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check aria-hidden className={cn("mt-1 size-4 shrink-0", featured ? "text-gold" : "text-[var(--offer)]")} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {offer.description && (
              <details className="group mt-6">
                <summary
                  className={cn(
                    "flex cursor-pointer list-none items-center gap-1.5 text-[15px] font-semibold underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden",
                    featured ? "text-white" : "text-navy",
                  )}
                >
                  <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
                  Voir le détail
                </summary>
                <p className={cn("mt-3 text-[15px]", featured && "text-white/90")}>{offer.description}</p>
              </details>
            )}
            <div className="mt-auto pt-7">
              <ButtonLink
                href={extra?.href ?? bookingHref(`offre-${slug}`)}
                variant={featured ? "accent" : extra?.secondary ? "secondary" : "primary"}
                block
                className={cn(!featured && (extra?.secondary ? OFFER_OUTLINE : OFFER_FILLED))}
              >
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
