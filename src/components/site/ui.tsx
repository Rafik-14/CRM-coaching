import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { siteButton, type SiteButtonProps } from "./button";
import { BOOKING_LABEL, bookingHref } from "./nav";

/** Brief §4: max 1240 px, 24 px gutters on desktop, 20 px on phones. */
export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto w-[calc(100%-40px)] max-w-[1240px] md:w-[calc(100%-48px)]", className)} {...props} />;
}

const tones = {
  white: "bg-white",
  ivory: "bg-ivory",
  navy: "bg-navy text-white jg-on-navy",
} as const;

/**
 * Page section. Alternate white → ivory → white → navy (brief §8).
 * Padding: 64–80 px on phones, 96–120 px on desktop.
 */
export function Section({
  tone = "white",
  size = "default",
  className,
  ...props
}: React.ComponentProps<"section"> & { tone?: keyof typeof tones; size?: "default" | "compact" }) {
  return (
    <section
      className={cn(
        tones[tone],
        size === "compact" ? "py-14 md:py-20" : "py-16 md:py-24 lg:py-[120px]",
        className,
      )}
      {...props}
    />
  );
}

/** Small uppercase label above a title (Montserrat, wide tracking). */
export function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "font-heading text-[13px] font-semibold tracking-[0.16em] text-navy uppercase [.jg-on-navy_&]:text-white/85",
        className,
      )}
      {...props}
    />
  );
}

/** Signature graphique: the short horizontal gold line. */
export function GoldLine({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block h-0.5 w-12 bg-gold", className)} />;
}

/** Reading width (680–720 px). */
export function Prose({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("jg-prose max-w-[720px]", className)} {...props} />;
}

type CtaProps = SiteButtonProps & { className?: string; children?: React.ReactNode };

export function ButtonLink({ href, variant, block, className, children, ...props }: CtaProps & React.ComponentProps<typeof Link>) {
  return (
    <Link href={href} className={cn(siteButton({ variant, block }), className)} {...props}>
      {children}
    </Link>
  );
}

/** The main call to action, everywhere: « Réserver un échange stratégique ». */
export function BookingButton({
  source,
  profil,
  label = BOOKING_LABEL,
  variant,
  block,
  className,
}: CtaProps & { source: string; profil?: string; label?: string }) {
  return (
    <ButtonLink href={bookingHref(source, profil)} variant={variant} block={block} className={className}>
      {label}
      <ArrowRight aria-hidden />
    </ButtonLink>
  );
}

/** Text link with an arrow (« Comprendre la Méthode JG® → »). The arrow stays on the last line when the text wraps. */
export function ArrowLink({ className, children, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "group inline-block min-h-11 max-w-full py-2.5 font-heading text-[15px] leading-snug font-semibold text-navy transition-colors duration-200 [.jg-on-navy_&]:text-white",
        className,
      )}
      {...props}
    >
      <span className="underline decoration-gold decoration-2 underline-offset-[6px] transition-colors duration-200 group-hover:decoration-navy [.jg-on-navy_&]:group-hover:decoration-white">
        {children}
      </span>
      <ArrowRight
        aria-hidden
        className="ml-2 inline size-4 align-[-3px] transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </Link>
  );
}

/** « Mot • mot • mot » list (domains, « Pour : … »). Separators end a line, they never start one. */
export function DotList({ items, className }: { items: readonly string[]; className?: string }) {
  return (
    <ul className={cn("leading-relaxed", className)}>
      {items.map((item, i) => (
        <li key={item} className="inline">
          <span className="whitespace-nowrap">{item}</span>
          {i < items.length - 1 && (
            <span aria-hidden className="text-gold">
              {"\u00a0• "}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
