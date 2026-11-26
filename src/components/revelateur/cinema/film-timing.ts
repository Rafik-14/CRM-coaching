/**
 * Beat sheet of the opening film (seconds after the tap, 20 s in all). Shared by the animation
 * (intro-film.tsx) and the sound score (audio.ts) so picture and sound stay locked together.
 */
export const FILM = {
  vous: 0.1, // giant « Vous » letters (4 hits, 0.12 s apart)
  vousStep: 0.12,
  aurora: 2.0, // aurora field rises, « Vous avez une valeur. »
  question: 3.9, // « Savez-vous ce qui vous rend »
  condense: 4.7, // the field condenses into the « unique ? » pill
  dot: 6.0, // the pill collapses to a dot
  burst: 6.3, // the dot bursts into a field of dots
  dims: 7.2, // the five dimensions
  dimStep: 0.62, // one dimension every…
  stat: 10.9, // 30 questions count-up
  lead: 12.75, // « Une expérience pour » · giant « révéler » · « ce qui vous distingue. »
  leadWord: 13.3,
  type: 14.45, // glass pill appears
  typing: 14.8, // first key
  keyStep: 0.07, // one key every…
  send: 16.0, // « send »
  logo: 16.6, // JG® monogram
  end: 20.0, // curtain lifts
} as const;
