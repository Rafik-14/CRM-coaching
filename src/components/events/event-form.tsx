"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import { createEvent, updateEvent } from "@/server/actions/events";
import type { ActionState } from "@/server/actions/coaching";
import { EVENT_AUDIENCES, EVENT_AUDIENCE_LABEL, EVENT_KINDS, EVENT_KIND_LABEL, parisInputs } from "@/lib/events";

export type EventFormDefaults = {
  id: string;
  kind: string;
  title: string;
  summary: string | null;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  onlineUrl: string | null;
  capacity: number | null;
  maxSeatsPerBooking: number;
  priceText: string | null;
  partner: string | null;
  audience: string | null;
  registrationOpen: boolean;
  waitlistEnabled: boolean;
  manualHistory: boolean;
};

/** Create or edit a conference / workshop. `history`: a past talk added for the record (no registrations). */
export function EventForm({ event, history = false }: { event?: EventFormDefaults; history?: boolean }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = event ? await updateEvent(event.id, prev, fd) : await createEvent(prev, fd);
    if (r?.ok) toast.success(r.message ?? "Enregistré");
    else if (r?.error) toast.error(r.error);
    return r ?? {};
  }, {});
  const err = (f: string) => state.fieldErrors?.[f]?.[0];
  const start = event ? parisInputs(event.startsAt) : null;
  const end = event ? parisInputs(event.endsAt) : null;
  const isHistory = event?.manualHistory ?? history;

  return (
    <form action={formAction} className="grid gap-6">
      {isHistory && <input type="hidden" name="manualHistory" value="on" />}
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <FormField label="Type" htmlFor="ev-kind">
          <Select name="kind" defaultValue={event?.kind ?? "conference"}>
            <SelectTrigger id="ev-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {EVENT_KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Titre *" htmlFor="ev-title" error={err("title")}>
          <Input id="ev-title" name="title" defaultValue={event?.title} placeholder="ex. Révéler sa valeur professionnelle" />
        </FormField>
      </div>

      <FormField label="Résumé" htmlFor="ev-summary" error={err("summary")} hint="Une ou deux phrases, affichées sur la liste des événements.">
        <Textarea id="ev-summary" name="summary" rows={2} defaultValue={event?.summary ?? ""} />
      </FormField>
      <FormField
        label="Description"
        htmlFor="ev-description"
        error={err("description")}
        hint="Ce que les participants vont vivre et en retirer. Laissez une ligne vide entre deux paragraphes."
      >
        <Textarea id="ev-description" name="description" rows={7} defaultValue={event?.description ?? ""} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Date *" htmlFor="ev-date" error={err("date")}>
          <Input id="ev-date" name="date" type="date" defaultValue={start?.date} />
        </FormField>
        <FormField label="Début *" htmlFor="ev-start" error={err("startTime")}>
          <Input id="ev-start" name="startTime" type="time" defaultValue={start?.time ?? "18:30"} />
        </FormField>
        <FormField label="Fin *" htmlFor="ev-end" error={err("endTime")}>
          <Input id="ev-end" name="endTime" type="time" defaultValue={end?.time ?? "20:00"} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Lieu" htmlFor="ev-location" error={err("location")} hint="Adresse de la salle. Laissez vide si c’est en ligne.">
          <Input id="ev-location" name="location" defaultValue={event?.location ?? ""} placeholder="ex. Maison des associations, 12 rue…, Lyon" />
        </FormField>
        {!isHistory && (
          <FormField label="Lien de visio" htmlFor="ev-online" error={err("onlineUrl")} hint="Envoyé seulement aux inscrits, jamais affiché sur le site.">
            <Input id="ev-online" name="onlineUrl" type="url" defaultValue={event?.onlineUrl ?? ""} placeholder="https://…" />
          </FormField>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Organisé avec" htmlFor="ev-partner" error={err("partner")} hint="Association, entreprise ou école (facultatif).">
          <Input id="ev-partner" name="partner" defaultValue={event?.partner ?? ""} />
        </FormField>
        <FormField label="Public" htmlFor="ev-audience">
          <Select name="audience" defaultValue={event?.audience ?? "tous"}>
            <SelectTrigger id="ev-audience" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_AUDIENCES.map((a) => (
                <SelectItem key={a} value={a}>
                  {EVENT_AUDIENCE_LABEL[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      {!isHistory && (
        <fieldset className="grid gap-4 rounded-xl border border-border p-4">
          <legend className="px-1 text-sm font-medium">Inscriptions</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Nombre de places" htmlFor="ev-capacity" error={err("capacity")} hint="Vide = sans limite.">
              <Input id="ev-capacity" name="capacity" type="number" min={1} defaultValue={event?.capacity ?? ""} />
            </FormField>
            <FormField label="Places max. par inscription" htmlFor="ev-max" error={err("maxSeatsPerBooking")}>
              <Input id="ev-max" name="maxSeatsPerBooking" type="number" min={1} max={20} defaultValue={event?.maxSeatsPerBooking ?? 4} />
            </FormField>
            <FormField label="Prix (texte affiché)" htmlFor="ev-price" error={err("priceText")} hint="Aucun paiement en ligne.">
              <Input id="ev-price" name="priceText" defaultValue={event?.priceText ?? ""} placeholder="Gratuit · 20 € sur place…" />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" name="registrationOpen" defaultChecked={event?.registrationOpen ?? true} className="size-4 accent-[var(--primary)]" />
              Inscriptions ouvertes
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" name="waitlistEnabled" defaultChecked={event?.waitlistEnabled ?? true} className="size-4 accent-[var(--primary)]" />
              Liste d’attente quand c’est complet
            </label>
          </div>
        </fieldset>
      )}
      {isHistory && (
        <>
          <input type="hidden" name="maxSeatsPerBooking" value="4" />
          <input type="hidden" name="registrationOpen" value="" />
        </>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {event ? "Enregistrer" : isHistory ? "Ajouter à l’historique" : "Créer l’événement"}
        </Button>
      </div>
    </form>
  );
}
