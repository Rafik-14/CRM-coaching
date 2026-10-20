import { ArrowDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BookingButton, Container, Eyebrow, GoldLine, Section } from "./ui";

/** Eyebrow + gold line + H2 (+ optional intro). */
export function SectionHeading({
  eyebrow,
  title,
  children,
  as: Tag = "h2",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div className={cn("max-w-[760px]", className)}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <GoldLine className={eyebrow ? "mt-4" : undefined} />
      <Tag className={cn(Tag === "h1" ? "jg-h1" : "jg-h2", "mt-6")}>{title}</Tag>
      {children && <div className="jg-prose mt-6">{children}</div>}
    </div>
  );
}

/** A key sentence set apart (gold rule on the left). */
export function Statement({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "border-l-2 border-gold pl-6 font-heading text-[1.375rem] leading-snug font-semibold text-navy md:text-[1.625rem] [.jg-on-navy_&]:text-white",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** « 01 — CLARIFIER » style numbered steps, in columns on desktop. */
export function Steps({
  steps,
  className,
}: {
  steps: readonly { title: string; text: string; caption?: string }[];
  className?: string;
}) {
  return (
    <ol className={cn("grid gap-10 md:grid-cols-3 md:gap-8", className)}>
      {steps.map((step, i) => (
        <li key={step.title} className="border-t border-[var(--jg-light-gray)] pt-6 [.jg-on-navy_&]:border-white/20">
          <p className="font-heading text-[15px] font-semibold tracking-[0.12em] text-navy uppercase [.jg-on-navy_&]:text-white">
            <span className="mr-2 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
            <span aria-hidden className="mr-2 text-gold">
              —
            </span>
            {step.title}
          </p>
          {step.caption && <p className="jg-small mt-1 tracking-[0.06em] uppercase opacity-80">{step.caption}</p>}
          <p className="mt-4">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}

/** A line of words joined by arrows (« Comprendre → Donner du sens → Rendre visible »). Vertical on phones. */
export function FlowLine({ items, className, strong }: { items: readonly string[]; className?: string; strong?: boolean }) {
  return (
    <ol
      className={cn(
        "flex flex-col items-start gap-2 font-heading md:flex-row md:flex-wrap md:items-center md:gap-4",
        strong ? "text-[1.0625rem] font-semibold tracking-[0.12em] text-navy uppercase" : "text-[15px] font-medium",
        className,
      )}
    >
      {items.map((item, i) => (
        <li key={item} className="flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-4">
          {i > 0 && (
            <>
              <ArrowRight aria-hidden className="hidden size-5 text-gold md:block" strokeWidth={1.75} />
              <ArrowDown aria-hidden className="size-5 text-gold md:hidden" strokeWidth={1.75} />
            </>
          )}
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

/** « AVANT » / « APRÈS » quotes, side by side on desktop. */
export function BeforeAfter({ pairs, className }: { pairs: readonly { before: string; after: string }[]; className?: string }) {
  return (
    <div className={cn("grid gap-6", className)}>
      {pairs.map((pair) => (
        <div key={pair.before} className="grid gap-px overflow-hidden rounded-[12px] bg-[var(--jg-light-gray)] md:grid-cols-2">
          <figure className="bg-white p-7 md:p-9">
            <figcaption className="font-heading text-[13px] font-semibold tracking-[0.16em] uppercase">Avant</figcaption>
            <blockquote className="mt-3 text-[1.0625rem] italic">« {pair.before} »</blockquote>
          </figure>
          <figure className="bg-white p-7 md:p-9">
            <figcaption className="flex items-center gap-3 font-heading text-[13px] font-semibold tracking-[0.16em] text-navy uppercase">
              <span aria-hidden className="h-0.5 w-6 bg-gold" />
              Après
            </figcaption>
            <blockquote className="mt-3 font-heading text-[1.125rem] leading-snug font-semibold text-navy">
              « {pair.after} »
            </blockquote>
          </figure>
        </div>
      ))}
    </div>
  );
}

/** Closing navy band with the main call to action (last section of every page). */
export function FinalCta({
  title,
  children,
  source,
  profil,
  label,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
  source: string;
  profil?: string;
  label?: string;
}) {
  return (
    <Section tone="navy">
      <Container>
        <GoldLine />
        <h2 className="jg-h2 mt-6 max-w-[820px]">{title}</h2>
        {children && (
          <div className="mt-5 max-w-[720px] font-heading text-[1.25rem] leading-snug font-medium text-white/85 md:text-[1.375rem]">
            {children}
          </div>
        )}
        <BookingButton source={source} profil={profil} label={label} variant="light" className="mt-10" />
      </Container>
    </Section>
  );
}

/** Wide diagram: scrolls sideways on phones so its text stays readable. */
export function WideFigure({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <figure
      tabIndex={0}
      aria-label={label}
      className={cn(
        "-mr-5 overflow-x-auto pr-5 md:mr-0 md:overflow-visible md:pr-0 [&_img]:w-[760px] [&_img]:max-w-none md:[&_img]:w-full md:[&_img]:max-w-full",
        className,
      )}
    >
      {children}
    </figure>
  );
}

/** Light card (10–12 px radius, hairline border, no heavy shadow). */
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-[12px] border border-[var(--jg-light-gray)] bg-white p-7 md:p-9", className)}
      {...props}
    />
  );
}
