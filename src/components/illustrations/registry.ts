import confused from "@/assets/illustrations/confused.webp";
import idea from "@/assets/illustrations/idea.webp";
import jump from "@/assets/illustrations/jump.webp";
import pointingSide from "@/assets/illustrations/pointing-side.webp";
import shhh from "@/assets/illustrations/shhh.webp";
import sittingHappy from "@/assets/illustrations/sitting-happy.webp";
import sittingNormal from "@/assets/illustrations/sitting-normal.webp";
import sittingRelaxed from "@/assets/illustrations/sitting-relaxed.webp";
import walkingHappy from "@/assets/illustrations/walking-happy.webp";
import waving from "@/assets/illustrations/waving.webp";

/**
 * 3D character illustrations ("Free 3D Man Illustrations", Figma Community),
 * converted from 5 MB SVGs to ~25 KB WebP. Static imports give Next.js their size.
 */
export const illustrations = {
  waving,
  "sitting-relaxed": sittingRelaxed,
  "sitting-happy": sittingHappy,
  "sitting-normal": sittingNormal,
  confused,
  shhh,
  jump,
  "pointing-side": pointingSide,
  idea,
  "walking-happy": walkingHappy,
} as const;

export type IllustrationName = keyof typeof illustrations;
