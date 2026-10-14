import { cva, type VariantProps } from "class-variance-authority";

/**
 * Website buttons (brief §5): Montserrat 600, 48–54 px tall, 7 px radius, never pills.
 * primary = navy · secondary = navy outline · accent = gold (rare) · light = white on navy sections.
 */
export const siteButton = cva(
  "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[7px] border px-7 py-3 text-center font-heading text-[15px] leading-tight font-semibold transition-[background-color,color,border-color,translate] duration-200 hover:-translate-y-px motion-reduce:hover:translate-y-0 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "border-navy bg-navy text-white hover:border-[var(--jg-navy-hover)] hover:bg-[var(--jg-navy-hover)]",
        secondary: "border-navy bg-transparent text-navy hover:bg-navy hover:text-white",
        accent: "border-gold bg-gold text-navy hover:border-white hover:bg-white",
        light: "border-white bg-white text-navy hover:border-gold hover:bg-gold",
        "outline-light": "border-white/70 bg-transparent text-white hover:border-white hover:bg-white hover:text-navy",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", block: false },
  },
);

export type SiteButtonProps = VariantProps<typeof siteButton>;
