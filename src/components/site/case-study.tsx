import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./ui";

/** Case study header: « photo » (monogram until real photos are supplied), name, field. */
export function CaseHeader({ name, domain, as: Tag = "h2" }: { name: string; domain?: string | null; as?: "h2" | "h3" }) {
  return (
    <div className="flex items-center gap-5">
      <span
        aria-hidden
        className="flex size-16 shrink-0 items-center justify-center rounded-full bg-navy font-heading text-[1.5rem] font-semibold text-white md:size-20 md:text-[1.75rem]"
      >
        {name[0]}
      </span>
      <div>
        <Tag className={Tag === "h2" ? "jg-h2" : "jg-h3"}>{name}</Tag>
        {domain && <p className="mt-1 font-heading text-[15px] font-medium tracking-[0.04em] text-navy">{domain}</p>}
      </div>
    </div>
  );
}

/** One step of the case (Avant / Le déclic / Après / Ce qui a changé), label in the left rail on desktop. */
export function CaseBlock({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-4 border-t border-[var(--jg-light-gray)] pt-8 md:grid-cols-[200px_1fr] md:gap-10", className)}>
      <Eyebrow className="flex items-center gap-3 self-start md:pt-1">
        <span aria-hidden className="h-0.5 w-6 bg-gold" />
        {label}
      </Eyebrow>
      <div className="jg-prose max-w-[720px]">{children}</div>
    </div>
  );
}

/** The person's own words, set as a quote. */
export function CaseQuote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="font-heading text-[1.1875rem] leading-snug font-medium text-navy md:text-[1.3125rem]">
      « {children} »
    </blockquote>
  );
}

/** The decisive element of a case (positioning statement, revealing anecdote): set apart on navy. */
export function KeyPiece({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="jg-on-navy rounded-[12px] bg-navy p-7 text-white md:p-10">
      <figcaption className="flex items-center gap-3 font-heading text-[13px] font-semibold tracking-[0.16em] uppercase">
        <span aria-hidden className="h-0.5 w-6 bg-gold" />
        {label}
      </figcaption>
      <div className="mt-5 font-heading text-[1.25rem] leading-snug font-semibold md:text-[1.5rem]">{children}</div>
    </figure>
  );
}

/** « De … → à … » list. Items without an arrow are shown as they are. */
export function ChangeList({ items }: { items: readonly string[] }) {
  return (
    <ul className="grid gap-4">
      {items.map((item) => {
        const [from, to] = item.split(/\s*→\s*/);
        return (
          <li key={item} className="rounded-[10px] border border-[var(--jg-light-gray)] bg-white p-5">
            {to ? (
              <span className="grid gap-2 md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-4">
                <span>{from}</span>
                <ArrowRight aria-label="vers" className="size-5 rotate-90 text-gold md:rotate-0" strokeWidth={1.75} />
                <strong>{to}</strong>
              </span>
            ) : (
              item
            )}
          </li>
        );
      })}
    </ul>
  );
}
