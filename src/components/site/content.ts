/** Anchor of an offer on /accompagnements: « Architecture Identitaire JG® » → « architecture-identitaire ». */
export function offerSlug(name: string) {
  return name
    .replace(/JG®?/g, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const DOMAINS = ["Identité professionnelle", "Positionnement", "Évolution", "Leadership", "Recrutement"] as const;

/** The two written case studies (page « Transformations »), with the teaser used on the home page. */
export const CASES = [
  {
    slug: "yannick",
    name: "Yannick",
    domain: "Comptabilité / gestion",
    teaser: "Je sais ce que je fais, mais j’ai du mal à expliquer ce qui me correspond vraiment.",
  },
  {
    slug: "jean-gabriel",
    name: "Jean-Gabriel",
    domain: "Data, BI & transformation des organisations",
    teaser: "Je sais parfaitement ce que je fais. Mais j’ai du mal à expliquer clairement ce que j’apporte réellement.",
  },
] as const;

export const BOOK = {
  amazon: "https://www.amazon.fr/dp/B0FNBRGLL7",
  trailer: "https://www.youtube.com/watch?v=4wdIefCVASw",
} as const;

/**
 * One colour per offer (home page cards, Accompagnements), so each formula is recognised at a glance.
 * Used as a CSS variable: style={{ "--offer": offerColor(slug) }} then text-[var(--offer)], border-[var(--offer)]…
 */
export const OFFER_COLORS: Record<string, string> = {
  "architecture-identitaire": "var(--jg-offer-architecture)",
  "accompagnement-decisif": "var(--jg-offer-decisif)",
  "parcours-signature": "var(--jg-offer-signature)",
  "bilan-de-competences": "var(--jg-offer-bilan)",
};
export const offerColor = (slug: string) => OFFER_COLORS[slug] ?? "var(--jg-navy)";
