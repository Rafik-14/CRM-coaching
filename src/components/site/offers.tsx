import { connection } from "next/server";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getPublicOffers, type PublicOffer } from "@/server/queries/site";
import { offerSlug } from "./content";
import { bookingHref } from "./nav";
import { ButtonLink, DotList, GoldLine } from "./ui";

/** « 170 € / 190 CHF · 1 séance » */
export function priceLine(offer: Pick<PublicOffer, "priceEur" | "priceChf" | "sessionsCount">, withSessions = true) {
  const prices = [formatMoney(offer.priceEur, "EUR"), offer.priceChf != null && formatMoney(offer.priceChf, "CHF")]
    .filter(Boolean)
    .join(" / ");
  if (!withSessions) return prices;
  // No-break spaces keep « · 3 séances » together when the line wraps.
  return `${prices} · ${offer.sessionsCount} séance${offer.sessionsCount > 1 ? "s" : ""}`;
}

/** Site wording that is not stored in the CRM (who the offer is for, button), keyed by offer anchor. */
const EXTRAS: Record<string, { label: string; items: string[]; cta: string; href: string; secondary?: boolean }> = {
  "architecture-identitaire": {
    label: "Pour :",
    items: ["Clarification", "Repositionnement", "Orientation", "Reconversion", "Évolution"],
    cta: "Réserver une Architecture Identitaire",
    href: bookingHref("offre-architecture-identitaire", "particulier"),
  },
  "accompagnement-decisif": {
    label: "Pour :",
    items: ["Entretien", "Stage", "Alternance", "Oral", "Pitch", "Négociation", "Prise de poste"],
    cta: "Parler de votre enjeu",
    href: bookingHref("offre-accompagnement-decisif", "particulier"),
  },
  "parcours-signature": {
    label: "Inclus :",
    items: [],
    cta: "Découvrir le Parcours Signature JG®",
    href: "/accompagnements/parcours-signature",
    secondary: true,
  },
};

/** The offers from the CRM (prices included), one airy row each. */
export async function OfferList() {
  await connection();
  const offers = await getPublicOffers();
  return (
    <ol className="grid gap-6">
      {offers.map((offer, i) => {
        const slug = offerSlug(offer.name);
        const extra = EXTRAS[slug];
        const items = extra?.items.length ? extra.items : offer.includes;
        const label = extra?.label ?? (offer.includes.length ? "Inclus :" : null);
        return (
          <li
            key={offer.id}
            id={slug}
            className="scroll-mt-28 rounded-[12px] border border-[var(--jg-light-gray)] bg-white p-7 md:p-12"
          >
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <div>
                <p className="font-heading text-[15px] font-semibold text-navy tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <GoldLine className="mt-3 w-8" />
                <h2 className="jg-h3 mt-5 tracking-[0.03em] uppercase">{offer.name}</h2>
                {offer.tagline && (
                  <p className="mt-3 font-heading text-[1.1875rem] leading-snug font-medium text-navy">{offer.tagline}</p>
                )}
                <p className="mt-6 font-heading text-[1.25rem] font-semibold text-navy">{priceLine(offer)}</p>
              </div>
              <div>
                {offer.description && <p>{offer.description}</p>}
                {label && items.length > 0 && (
                  <div className="mt-6">
                    <p className="font-semibold text-navy">{label}</p>
                    <DotList items={items} className="mt-1" />
                  </div>
                )}
                <ButtonLink
                  href={extra?.href ?? bookingHref(`offre-${slug}`)}
                  variant={extra?.secondary ? "secondary" : "primary"}
                  className="mt-8"
                >
                  {extra?.cta ?? "Réserver un échange stratégique"}
                </ButtonLink>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function OfferListSkeleton() {
  return (
    <div className="grid gap-6" aria-busy>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-72 animate-pulse rounded-[12px] border border-[var(--jg-light-gray)] bg-white" />
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
