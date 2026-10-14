"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarCheck, ChevronDown } from "lucide-react";
import { bookEchange } from "@/server/actions/booking";
import type { SiteFormState } from "@/lib/validations/site";
import type { AvailableDay } from "@/lib/booking";
import { STAKES } from "@/lib/jg";
import { APP_TIME_ZONE } from "@/lib/format";
import { cn } from "@/lib/utils";
import { siteButton } from "./button";
import { ConsentCheckbox, Field, Honeypot, SegmentSelect, SubSegmentSelect, controlProps, inputClass } from "./form";

const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
const longDayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit" });
/** « 2026-10-15 » is a calendar day: format it as such (noon UTC avoids any day shift). */
const asDay = (date: string) => new Date(`${date}T12:00:00Z`);
/** « Jeu 15 oct. » */
const shortDay = (date: string) => {
  const text = dayFmt.format(asDay(date)).replace(".", "");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const FIRST_DAYS = 15;

export function BookingWidget({
  days,
  slotMinutes,
  location,
  profil,
  source,
}: {
  days: AvailableDay[];
  slotMinutes: number;
  location: string;
  profil: string;
  source: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<SiteFormState, FormData>(async (prev, fd) => {
    const result = await bookEchange(prev, fd);
    // Slot taken meanwhile: reload the availability.
    if (result.error) router.refresh();
    return result;
  }, {});
  const [day, setDay] = useState(days[0]?.date ?? "");
  const [slot, setSlot] = useState(state.values?.slot ?? "");
  const [showAll, setShowAll] = useState(false);
  const [segment, setSegment] = useState(profil);
  const e = state.fieldErrors;
  const val = (name: string) => state.values?.[name] ?? "";

  if (days.length === 0) {
    return (
      <div className="rounded-[12px] border border-[var(--jg-light-gray)] bg-white p-7 md:p-9">
        <p className="jg-h4 font-heading font-semibold text-navy">Aucun créneau n’est disponible pour le moment.</p>
        <p className="mt-3">
          Écrivez-moi depuis la{" "}
          <Link href={`/contact?source=reserver${profil ? `&profil=${profil}` : ""}`} className="font-semibold text-navy underline">
            page Contact
          </Link>{" "}
          : je vous propose un horaire rapidement.
        </p>
      </div>
    );
  }

  const visibleDays = showAll ? days : days.slice(0, FIRST_DAYS);
  const current = days.find((d) => d.date === day) ?? days[0];

  return (
    <form action={action} noValidate className="relative grid gap-10">
      <Honeypot />
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="slot" value={slot} />

      {/* 1 — day */}
      <fieldset>
        <legend className="font-heading text-[1.125rem] font-semibold text-navy">
          <span className="text-gold" aria-hidden>
            01 —{" "}
          </span>
          Choisissez un jour
        </legend>
        <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {visibleDays.map((d) => {
            const selected = d.date === current.date;
            return (
              <li key={d.date}>
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${longDayFmt.format(asDay(d.date))}, ${d.slots.length} créneau${d.slots.length > 1 ? "x" : ""}`}
                  onClick={() => {
                    setDay(d.date);
                    setSlot("");
                  }}
                  className={cn(
                    "flex min-h-14 w-full flex-col items-center justify-center rounded-[7px] border px-2 py-2 font-heading text-[14px] font-semibold transition-colors",
                    selected
                      ? "border-navy bg-navy text-white"
                      : "border-[var(--jg-light-gray)] bg-white text-navy hover:border-navy",
                  )}
                >
                  {shortDay(d.date)}
                </button>
              </li>
            );
          })}
        </ul>
        {days.length > FIRST_DAYS && (
          <button
            type="button"
            onClick={() => setShowAll((s) => !s)}
            className="mt-3 inline-flex min-h-11 items-center gap-2 font-heading text-[14px] font-semibold text-navy underline decoration-gold decoration-2 underline-offset-4"
          >
            {showAll ? "Moins de dates" : "Plus de dates"}
            <ChevronDown aria-hidden className={cn("size-4 transition-transform", showAll && "rotate-180")} />
          </button>
        )}
      </fieldset>

      {/* 2 — time */}
      <fieldset>
        <legend className="font-heading text-[1.125rem] font-semibold text-navy">
          <span className="text-gold" aria-hidden>
            02 —{" "}
          </span>
          Choisissez un horaire <span className="font-sans text-[15px] font-normal">({longDayFmt.format(asDay(current.date))})</span>
        </legend>
        <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {current.slots.map((s) => {
            const selected = s === slot;
            return (
              <li key={s}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSlot(s)}
                  className={cn(
                    "flex min-h-12 w-full items-center justify-center rounded-[7px] border font-heading text-[15px] font-semibold tabular-nums transition-colors",
                    selected
                      ? "border-navy bg-navy text-white"
                      : "border-[var(--jg-light-gray)] bg-white text-navy hover:border-navy",
                  )}
                >
                  {timeFmt.format(new Date(s))}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="jg-small mt-3">
          Heure de Paris / Genève · {slotMinutes} minutes · {location}
        </p>
        {e?.slot && (
          <p className="jg-small mt-2 font-semibold text-[#b42318]" role="alert">
            {e.slot[0]}
          </p>
        )}
      </fieldset>

      {/* 3 — details */}
      <fieldset className="grid gap-6">
        <legend className="mb-4 font-heading text-[1.125rem] font-semibold text-navy">
          <span className="text-gold" aria-hidden>
            03 —{" "}
          </span>
          Vos coordonnées
        </legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Prénom" name="firstName" error={e?.firstName}>
            <input {...controlProps("firstName", e)} defaultValue={val("firstName")} autoComplete="given-name" className={inputClass} />
          </Field>
          <Field label="Nom" name="lastName" error={e?.lastName}>
            <input {...controlProps("lastName", e)} defaultValue={val("lastName")} autoComplete="family-name" className={inputClass} />
          </Field>
          <Field label="E-mail" name="email" error={e?.email}>
            <input {...controlProps("email", e)} defaultValue={val("email")} type="email" autoComplete="email" className={inputClass} />
          </Field>
          <Field label="Téléphone" name="phone" optional error={e?.phone}>
            <input {...controlProps("phone", e)} defaultValue={val("phone")} type="tel" autoComplete="tel" className={inputClass} />
          </Field>
          <Field label="Vous êtes" name="segment" optional error={e?.segment}>
            <SegmentSelect defaultValue={state.values?.segment ?? profil} errors={e} onChange={setSegment} />
          </Field>
          {segment === "particulier" ? (
            <Field label="Votre situation" name="subSegment" optional error={e?.subSegment}>
              <SubSegmentSelect errors={e} defaultValue={val("subSegment")} />
            </Field>
          ) : (
            <span className="hidden sm:block" />
          )}
          <Field label="Votre enjeu" name="stake" optional error={e?.stake}>
            <select {...controlProps("stake", e)} defaultValue={val("stake")} className={cn(inputClass, "appearance-auto")}>
              <option value="">—</option>
              {STAKES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          label="Votre situation en quelques mots"
          name="message"
          optional
          hint="Ce que vous cherchez à faire évoluer, ce qui vous amène aujourd’hui."
          error={e?.message}
        >
          <textarea {...controlProps("message", e)} defaultValue={val("message")} rows={4} className={cn(inputClass, "resize-y")} />
        </Field>
        <ConsentCheckbox errors={e} />
      </fieldset>

      {state.error && (
        <p role="alert" className="rounded-[7px] border border-[#b42318]/30 bg-[#b42318]/5 p-4 font-semibold text-[#b42318]">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <button type="submit" disabled={pending || !slot} className={cn(siteButton(), "disabled:cursor-not-allowed disabled:opacity-50")}>
          <CalendarCheck aria-hidden />
          {pending ? "Réservation en cours…" : "Confirmer mon échange stratégique"}
        </button>
        <p className="jg-small" aria-live="polite">
          {slot
            ? `${longDayFmt.format(asDay(current.date))} à ${timeFmt.format(new Date(slot))}`
            : "Choisissez d’abord un horaire."}
        </p>
      </div>
    </form>
  );
}
