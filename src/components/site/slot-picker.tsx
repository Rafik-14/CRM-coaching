"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { AvailableDay } from "@/lib/booking";
import { APP_TIME_ZONE } from "@/lib/format";
import { cn } from "@/lib/utils";

const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
export const longDayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
export const slotTimeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit" });
/** « 2026-10-15 » is a calendar day: format it as such (noon UTC avoids any day shift). */
export const asDay = (date: string) => new Date(`${date}T12:00:00Z`);
/** « Jeu 15 oct. » */
const shortDay = (date: string) => {
  const text = dayFmt.format(asDay(date)).replace(".", "");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const FIRST_DAYS = 15;

/** « Vendredi 16 octobre à 10:30 » for the selected slot. */
export function describeSlot(days: AvailableDay[], slot: string) {
  const day = days.find((d) => d.slots.includes(slot));
  return day ? `${longDayFmt.format(asDay(day.date))} à ${slotTimeFmt.format(new Date(slot))}` : "";
}

function Legend({ number, children }: { number?: string; children: React.ReactNode }) {
  return (
    <legend className="font-heading text-[1.125rem] font-semibold text-navy">
      {number && (
        <span className="text-gold" aria-hidden>
          {number} —{" "}
        </span>
      )}
      {children}
    </legend>
  );
}

/**
 * Day then time, JG® style (public booking, client booking link, moving a booking).
 * The parent keeps the chosen slot (ISO instant) and posts it in a hidden input.
 */
export function SlotPicker({
  days,
  slot,
  onSlotChange,
  info,
  error,
  numbers,
}: {
  days: AvailableDay[];
  slot: string;
  onSlotChange: (slot: string) => void;
  /** Line under the times, e.g. « Heure de Paris / Genève · 60 minutes · Visio ». */
  info: string;
  error?: string;
  /** Step numbers for the two legends, e.g. ["01", "02"]. */
  numbers?: [string, string];
}) {
  const [day, setDay] = useState(() => days.find((d) => d.slots.includes(slot))?.date ?? days[0]?.date ?? "");
  const [showAll, setShowAll] = useState(false);
  const visibleDays = showAll ? days : days.slice(0, FIRST_DAYS);
  const current = days.find((d) => d.date === day) ?? days[0];
  if (!current) return null;

  return (
    <>
      <fieldset>
        <Legend number={numbers?.[0]}>Choisissez un jour</Legend>
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
                    onSlotChange("");
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

      <fieldset>
        <Legend number={numbers?.[1]}>
          Choisissez un horaire <span className="font-sans text-[15px] font-normal">({longDayFmt.format(asDay(current.date))})</span>
        </Legend>
        <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {current.slots.map((s) => {
            const selected = s === slot;
            return (
              <li key={s}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSlotChange(s)}
                  className={cn(
                    "flex min-h-12 w-full items-center justify-center rounded-[7px] border font-heading text-[15px] font-semibold tabular-nums transition-colors",
                    selected
                      ? "border-navy bg-navy text-white"
                      : "border-[var(--jg-light-gray)] bg-white text-navy hover:border-navy",
                  )}
                >
                  {slotTimeFmt.format(new Date(s))}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="jg-small mt-3">{info}</p>
        {error && (
          <p className="jg-small mt-2 font-semibold text-[#b42318]" role="alert">
            {error}
          </p>
        )}
      </fieldset>
    </>
  );
}
