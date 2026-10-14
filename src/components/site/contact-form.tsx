"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CircleCheck, Send } from "lucide-react";
import { sendContactMessage } from "@/server/actions/site";
import type { SiteFormState } from "@/lib/validations/site";
import { SEGMENT_VALUES } from "@/lib/jg";
import { cn } from "@/lib/utils";
import { siteButton } from "./button";
import { ConsentCheckbox, Field, Honeypot, SegmentSelect, SubSegmentSelect, controlProps, inputClass } from "./form";

/** « Vous préférez m'écrire ? » — reads ?profil / ?source to pre-fill the client type. */
export function ContactForm() {
  const params = useSearchParams();
  const profil = params.get("profil") ?? "";
  return <ContactFormFields profil={(SEGMENT_VALUES as readonly string[]).includes(profil) ? profil : ""} source={params.get("source") ?? ""} />;
}

export function ContactFormFields({ profil = "", source = "" }: { profil?: string; source?: string }) {
  const [state, action, pending] = useActionState<SiteFormState, FormData>(sendContactMessage, {});
  const [segment, setSegment] = useState(profil);
  const e = state.fieldErrors;
  const val = (name: string) => state.values?.[name] ?? "";

  if (state.ok) {
    return (
      <div role="status" className="rounded-[12px] border border-[var(--jg-light-gray)] bg-white p-8">
        <CircleCheck aria-hidden className="size-8 text-[var(--jg-teal)]" strokeWidth={1.75} />
        <p className="jg-h4 mt-4 font-heading font-semibold text-navy">Merci, votre message est bien envoyé.</p>
        <p className="mt-2">Je reviens vers vous rapidement.</p>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="relative grid gap-6">
      <Honeypot />
      <input type="hidden" name="source" value={source} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Nom" name="lastName" error={e?.lastName}>
          <input {...controlProps("lastName", e)} defaultValue={val("lastName")} autoComplete="family-name" required className={inputClass} />
        </Field>
        <Field label="Prénom" name="firstName" error={e?.firstName}>
          <input {...controlProps("firstName", e)} defaultValue={val("firstName")} autoComplete="given-name" required className={inputClass} />
        </Field>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="E-mail" name="email" error={e?.email}>
          <input {...controlProps("email", e)} defaultValue={val("email")} type="email" autoComplete="email" required className={inputClass} />
        </Field>
        <Field label="Téléphone" name="phone" optional error={e?.phone}>
          <input {...controlProps("phone", e)} defaultValue={val("phone")} type="tel" autoComplete="tel" className={inputClass} />
        </Field>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Vous êtes" name="segment" optional error={e?.segment}>
          <SegmentSelect defaultValue={state.values?.segment ?? profil} errors={e} onChange={setSegment} />
        </Field>
        {segment === "particulier" && (
          <Field label="Votre situation" name="subSegment" optional error={e?.subSegment}>
            <SubSegmentSelect errors={e} defaultValue={val("subSegment")} />
          </Field>
        )}
      </div>
      <Field label="Votre message" name="message" error={e?.message}>
        <textarea {...controlProps("message", e)} defaultValue={val("message")} rows={6} required className={cn(inputClass, "resize-y")} />
      </Field>
      <ConsentCheckbox errors={e} />
      {state.error && (
        <p role="alert" className="font-semibold text-[#b42318]">
          {state.error}
        </p>
      )}
      <div>
        <button type="submit" disabled={pending} className={cn(siteButton(), "disabled:opacity-60")}>
          {pending ? "Envoi en cours…" : "Envoyer mon message"}
          <Send aria-hidden />
        </button>
      </div>
    </form>
  );
}
