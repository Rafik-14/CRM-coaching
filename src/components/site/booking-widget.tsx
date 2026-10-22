"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { bookEchange } from "@/server/actions/booking";
import type { SiteFormState } from "@/lib/validations/site";
import type { AvailableDay } from "@/lib/booking";
import { STAKES } from "@/lib/jg";
import { cn } from "@/lib/utils";
import { siteButton } from "./button";
import { SlotPicker, describeSlot } from "./slot-picker";
import { ConsentCheckbox, Field, Honeypot, SegmentSelect, SubSegmentSelect, controlProps, inputClass } from "./form";

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
  const [slot, setSlot] = useState(state.values?.slot ?? "");
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

  return (
    <form action={action} noValidate className="relative grid gap-10">
      <Honeypot />
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="slot" value={slot} />

      <SlotPicker
        days={days}
        slot={slot}
        onSlotChange={setSlot}
        info={`Heure de Paris / Genève · ${slotMinutes} minutes · ${location}`}
        error={e?.slot?.[0]}
        numbers={["01", "02"]}
      />

      {/* 3 — details */}
      <fieldset className="grid gap-6">
        <legend className="mb-4 font-heading text-[1.125rem] font-semibold text-navy">
          <span className="text-[var(--jg-gold-ink)]" aria-hidden>
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
          {slot ? describeSlot(days, slot) : "Choisissez d’abord un horaire."}
        </p>
      </div>
    </form>
  );
}
