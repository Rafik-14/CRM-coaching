import Link from "next/link";
import { LEGAL_PAGES_PUBLISHED } from "./nav";
import { SEGMENTS, SUB_SEGMENTS } from "@/lib/jg";
import { cn } from "@/lib/utils";

/** Website form controls (brief: 7 px radius, light grey border, 48 px+ tall, visible focus). */
export const inputClass =
  "block w-full rounded-[7px] border border-[color-mix(in_oklab,var(--jg-light-gray)_70%,var(--jg-anthracite))] bg-white px-4 py-3 text-[1rem] text-[var(--jg-anthracite)] placeholder:text-[color-mix(in_oklab,var(--jg-anthracite)_55%,white)] transition-colors focus:border-navy focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy aria-invalid:border-[#b42318] min-h-12";

export function Field({
  label,
  name,
  error,
  optional,
  hint,
  className,
  children,
}: {
  label: string;
  name: string;
  error?: string[];
  optional?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <label htmlFor={name} className="font-heading text-[14px] font-semibold text-navy">
        {label}
        {optional && <span className="ml-1 font-sans font-normal text-[var(--jg-anthracite)]">(facultatif)</span>}
      </label>
      {children}
      {hint && !error && <p className="jg-small">{hint}</p>}
      {error && (
        <p id={`${name}-error`} className="jg-small font-semibold text-[#b42318]">
          {error[0]}
        </p>
      )}
    </div>
  );
}

/** Props for an input wired to its Field (id, aria-invalid, error description). */
export function controlProps(name: string, errors?: Record<string, string[] | undefined>) {
  const invalid = !!errors?.[name];
  return {
    id: name,
    name,
    "aria-invalid": invalid || undefined,
    "aria-describedby": invalid ? `${name}-error` : undefined,
  };
}

export function SegmentSelect({
  defaultValue,
  errors,
  onChange,
}: {
  defaultValue?: string;
  errors?: Record<string, string[] | undefined>;
  onChange?: (value: string) => void;
}) {
  return (
    <select
      {...controlProps("segment", errors)}
      defaultValue={defaultValue ?? ""}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      className={cn(inputClass, "appearance-auto")}
    >
      <option value="">Je préfère ne pas préciser</option>
      {SEGMENTS.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

export function SubSegmentSelect({ errors, defaultValue }: { errors?: Record<string, string[] | undefined>; defaultValue?: string }) {
  return (
    <select {...controlProps("subSegment", errors)} defaultValue={defaultValue ?? ""} className={cn(inputClass, "appearance-auto")}>
      <option value="">—</option>
      {SUB_SEGMENTS.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

/** Privacy consent (required) — links to the privacy policy. */
export function ConsentCheckbox({ errors }: { errors?: Record<string, string[] | undefined> }) {
  const invalid = !!errors?.consent;
  return (
    <div className="grid gap-2">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="consent"
          required
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? "consent-error" : undefined}
          className="mt-1 size-5 shrink-0 accent-[var(--jg-navy)]"
        />
        <span className="jg-small">
          J’accepte que mes informations soient utilisées pour me recontacter{LEGAL_PAGES_PUBLISHED && (
            <>
              , conformément à la rubrique{" "}
              <Link href="/mentions-legales#donnees-personnelles" className="font-semibold text-navy underline underline-offset-2">
                « Données personnelles » des mentions légales
              </Link>
            </>
          )}
          .
        </span>
      </label>
      {invalid && (
        <p id="consent-error" className="jg-small font-semibold text-[#b42318]">
          {errors.consent?.[0]}
        </p>
      )}
    </div>
  );
}

/** Hidden from people, tempting for bots. */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Site web
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
