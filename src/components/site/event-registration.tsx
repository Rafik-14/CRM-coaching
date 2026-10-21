"use client";

import { useActionState, useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { cancelMyRegistration, registerForEventPublic } from "@/server/actions/events";
import type { SiteFormState } from "@/lib/validations/site";
import { cn } from "@/lib/utils";
import { siteButton } from "./button";
import { ConsentCheckbox, Field, Honeypot, controlProps, inputClass } from "./form";

/** « Réserver ma place » on an event page. `waitlist`: the event is full, the form joins the waiting list. */
export function EventRegistrationForm({ eventId, maxSeats, waitlist }: { eventId: string; maxSeats: number; waitlist: boolean }) {
  const [state, action, pending] = useActionState<SiteFormState, FormData>(registerForEventPublic.bind(null, eventId), {});
  const e = state.fieldErrors;
  const val = (name: string) => state.values?.[name] ?? "";

  // A new registration goes to its confirmation page; `ok` here means the address was already registered.
  if (state.ok) {
    return (
      <div role="status" className="rounded-[12px] border border-[var(--jg-light-gray)] bg-ivory p-6">
        <p className="font-heading font-semibold text-navy">Cette adresse e-mail est déjà inscrite.</p>
        <p className="mt-2">Nous venons d’y renvoyer le lien personnel de l’inscription, pour la consulter ou l’annuler.</p>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="relative grid gap-6">
      <Honeypot />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Prénom" name="firstName" error={e?.firstName}>
          <input {...controlProps("firstName", e)} defaultValue={val("firstName")} autoComplete="given-name" required className={inputClass} />
        </Field>
        <Field label="Nom" name="lastName" error={e?.lastName}>
          <input {...controlProps("lastName", e)} defaultValue={val("lastName")} autoComplete="family-name" required className={inputClass} />
        </Field>
      </div>
      <Field label="E-mail" name="email" error={e?.email}>
        <input {...controlProps("email", e)} defaultValue={val("email")} type="email" autoComplete="email" required className={inputClass} />
      </Field>
      <div className="grid gap-6 sm:grid-cols-[1fr_140px]">
        <Field label="Téléphone" name="phone" optional error={e?.phone}>
          <input {...controlProps("phone", e)} defaultValue={val("phone")} type="tel" autoComplete="tel" className={inputClass} />
        </Field>
        {maxSeats > 1 ? (
          <Field label="Nombre de places" name="seats" error={e?.seats}>
            <select {...controlProps("seats", e)} defaultValue={val("seats") || "1"} className={inputClass}>
              {Array.from({ length: maxSeats }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <input type="hidden" name="seats" value="1" />
        )}
      </div>
      <Field label="Entreprise, école ou association" name="company" optional error={e?.company}>
        <input {...controlProps("company", e)} defaultValue={val("company")} autoComplete="organization" className={inputClass} />
      </Field>
      <ConsentCheckbox errors={e} />
      {state.error && (
        <p role="alert" className="font-semibold text-[#b42318]">
          {state.error}
        </p>
      )}
      <div>
        <button type="submit" disabled={pending} className={cn(siteButton(), "disabled:opacity-60")}>
          {pending ? "Envoi en cours…" : waitlist ? "Rejoindre la liste d’attente" : "Réserver ma place"}
          <ArrowRight aria-hidden />
        </button>
      </div>
    </form>
  );
}

/** /inscription/<token> › cancel in one click (frees the seat for someone else). */
export function CancelRegistrationButton({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={siteButton({ variant: "secondary" })}>
        Annuler mon inscription
      </button>
    );
  }
  return (
    <div className="grid gap-3 rounded-[12px] border border-[var(--jg-light-gray)] bg-ivory p-6">
      <p className="font-heading font-semibold text-navy">Vous confirmez l’annulation ?</p>
      <p className="jg-small">Votre place sera proposée à quelqu’un d’autre.</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await cancelMyRegistration(token);
              if (r.error) setError(r.error);
            })
          }
          className={cn(siteButton(), "disabled:opacity-60")}
        >
          {pending ? "Annulation…" : "Oui, annuler"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className={siteButton({ variant: "secondary" })}>
          Non, je garde ma place
        </button>
      </div>
      {error && (
        <p role="alert" className="font-semibold text-[#b42318]">
          {error}
        </p>
      )}
    </div>
  );
}
