/** Tag that records the offer recommended after the « Échange stratégique » (e.g. « Offre recommandée : Focus Décisif JG® »). */
export const RECOMMENDED_TAG = "Offre recommandée : ";

/** The recommended offer's name, read back from the contact's tags (null if none). */
export function recommendedOffer(tags: readonly string[]) {
  const tag = tags.find((t) => t.startsWith(RECOMMENDED_TAG));
  return tag ? tag.slice(RECOMMENDED_TAG.length) : null;
}
