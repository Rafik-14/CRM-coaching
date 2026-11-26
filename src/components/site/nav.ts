/** Public website navigation (brief « Architecture visuelle du site JG® »). */
export const SITE_NAV = [
  { href: "/", label: "Accueil" },
  { href: "/methode", label: "La Méthode JG®" },
  { href: "/accompagnements", label: "Accompagnements" },
  { href: "/bilan-de-competences", label: "Bilan de compétences" },
  { href: "/pour-qui", label: "Pour qui ?" },
  { href: "/transformations", label: "Transformations" },
  { href: "/a-propos", label: "À propos" },
  { href: "/evenements", label: "Événements" },
  { href: "/le-chant-du-merle", label: "Le Chant du Merle | Mon premier roman" },
  { href: "/contact", label: "Contact" },
] as const;

/** Desktop: these pages sit in the « Plus » menu (ten pages don't fit on one line); phones list them all. */
/** « À propos » stays in the bar, between Transformations and Contact (« MODIFICATIONS 3.0 »). */
export const DESKTOP_MORE: readonly string[] = ["/evenements", "/le-chant-du-merle"];
/**
 * Since Le Révélateur has its own tab (26 Nov.), « Bilan de compétences » joins the « Plus » menu on computer
 * screens narrower than 1900 px (choice of 26 Nov.); it stays in the bar on wider screens and in the phone menu.
 */
export const DESKTOP_MORE_BELOW_WIDE: readonly string[] = ["/bilan-de-competences"];

/**
 * Le Révélateur (Test Signature JG®): a highlighted tab of its own, between « Pour qui ? » and « Transformations »
 * (Jérémy, 26 Nov.), shown only when the test is switched on (REVELATEUR_ENABLED, read by the server header). Opens the
 * test directly. Drawn on two lines: a gold « ★ Exclusivité JG » above « Test de personnalité Le Révélateur ».
 */
export const TEST_NAV_ITEM = {
  href: "/revelateur",
  label: "Exclusivité JG, Test de personnalité Le Révélateur",
  kicker: "Exclusivité JG",
  title: "Test de personnalité Le Révélateur",
} as const;
export const TEST_NAV_AFTER = "/pour-qui";

/**
 * CGV and Mentions légales stay unpublished (pages answer 404, no links) until Jérémy has validated the legal points
 * of his business status (« Modifications 2.1 »). Set to true to publish them again.
 */
export const LEGAL_PAGES_PUBLISHED = false;

const LEGAL_PAGES = [
  { href: "/cgv", label: "CGV" },
  { href: "/mentions-legales", label: "Mentions légales" },
] as const;

/** Small links at the bottom of every page. */
export const LEGAL_NAV = [{ href: "/faq", label: "FAQ" }, ...(LEGAL_PAGES_PUBLISHED ? LEGAL_PAGES : [])];

export const BOOKING_LABEL = "Réserver un échange stratégique";

/**
 * Link to the online booking page. `source` tells the CRM which button was used,
 * `profil` pre-selects the client type (particulier, entrepreneur, entreprise, cabinet_rh, ecole).
 */
export function bookingHref(source: string, profil?: string) {
  const params = new URLSearchParams({ source });
  if (profil) params.set("profil", profil);
  return `/reserver?${params}`;
}

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
