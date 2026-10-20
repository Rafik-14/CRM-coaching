"use client";

import { useActionState, useRef } from "react";
import { ImagePlus, Loader2, Quote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormField } from "@/components/form-field";
import { addQuote, deleteEventPhoto, deleteQuote, saveRecap, uploadEventPhotos } from "@/server/actions/events";
import type { ActionState } from "@/server/actions/coaching";

type Photo = { id: string; kind: string; width: number | null; height: number | null };
type QuoteItem = { id: string; text: string; author: string | null };

export const photoUrl = (id: string) => `/api/evenements/photo/${id}`;

/** Cover picture of an event (upcoming and past). */
export function CoverPhoto({ eventId, cover }: { eventId: string; cover: Photo | null }) {
  return (
    <div className="grid gap-3">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element -- served by our own permission-checked route
        <img src={photoUrl(cover.id)} alt="" className="aspect-[16/9] w-full rounded-xl object-cover" />
      ) : (
        <div className="grid aspect-[16/9] place-content-center rounded-xl border border-dashed text-sm text-muted-foreground">Pas encore de photo de couverture</div>
      )}
      <PhotoUpload eventId={eventId} kind="cover" label={cover ? "Changer la photo" : "Ajouter une photo de couverture"} />
    </div>
  );
}

function PhotoUpload({ eventId, kind, label }: { eventId: string; kind: "cover" | "gallery"; label: string }) {
  const form = useRef<HTMLFormElement>(null);
  const [, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await uploadEventPhotos(eventId, kind, prev, fd);
    if (r.ok) {
      toast.success(r.message ?? "Photos ajoutées");
      form.current?.reset();
    } else if (r.error) toast.error(r.error);
    return r;
  }, {});
  return (
    <form ref={form} action={formAction}>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent has-[:disabled]:opacity-50">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        {pending ? "Envoi…" : label}
        <input
          type="file"
          name="photos"
          accept="image/jpeg,image/png,image/webp"
          multiple={kind === "gallery"}
          className="sr-only"
          disabled={pending}
          onChange={(e) => e.currentTarget.files?.length && form.current?.requestSubmit()}
        />
      </label>
    </form>
  );
}

/** « Compte rendu » after the event: text, photos, quotes, and whether it shows on the website. */
export function RecapPanel({
  eventId,
  recap,
  participantsShown,
  videoUrl,
  showRecap,
  photos,
  quotes,
  suggestedParticipants,
}: {
  eventId: string;
  recap: string | null;
  participantsShown: number | null;
  videoUrl: string | null;
  showRecap: boolean;
  photos: Photo[];
  quotes: QuoteItem[];
  suggestedParticipants: number;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await saveRecap(eventId, prev, fd);
    if (r.ok) toast.success(r.message ?? "Enregistré");
    else if (r.error) toast.error(r.error);
    return r;
  }, {});
  const err = (f: string) => state.fieldErrors?.[f]?.[0];
  const gallery = photos.filter((p) => p.kind === "gallery");

  return (
    <div className="grid gap-8">
      <form action={formAction} className="grid gap-4">
        <FormField label="Ce qui s’est passé" htmlFor="recap-text" error={err("recap")} hint="Quelques lignes pour le site : le thème, l’ambiance, ce que les participants sont repartis avec.">
          <Textarea id="recap-text" name="recap" rows={6} defaultValue={recap ?? ""} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Nombre de participants à afficher"
            htmlFor="recap-participants"
            error={err("participantsShown")}
            hint={suggestedParticipants ? `${suggestedParticipants} présents notés dans la liste.` : "Facultatif."}
          >
            <Input id="recap-participants" name="participantsShown" type="number" min={1} defaultValue={participantsShown ?? ""} />
          </FormField>
          <FormField label="Vidéo (lien)" htmlFor="recap-video" error={err("videoUrl")} hint="YouTube, Vimeo… (facultatif).">
            <Input id="recap-video" name="videoUrl" type="url" defaultValue={videoUrl ?? ""} placeholder="https://…" />
          </FormField>
        </div>
        <label className="inline-flex items-start gap-2 text-sm">
          <input type="checkbox" name="showRecap" defaultChecked={showRecap} className="mt-0.5 size-4 accent-[var(--primary)]" />
          <span>
            Afficher le compte rendu, les photos et les témoignages sur le site
            <span className="block text-xs text-muted-foreground">Assurez-vous d’avoir l’accord des personnes visibles sur les photos et des auteurs des témoignages.</span>
          </span>
        </label>
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Enregistrer le compte rendu
          </Button>
        </div>
      </form>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Photos ({gallery.length})</h3>
          <PhotoUpload eventId={eventId} kind="gallery" label="Ajouter des photos" />
        </div>
        {gallery.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {gallery.map((p) => (
              <li key={p.id} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- served by our own permission-checked route */}
                <img src={photoUrl(p.id)} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
                <ConfirmDialog
                  trigger={
                    <Button variant="secondary" size="icon" className="absolute top-2 right-2 size-8 opacity-90" aria-label="Supprimer la photo">
                      <Trash2 />
                    </Button>
                  }
                  title="Supprimer cette photo ?"
                  description="Elle disparaît du CRM et du site."
                  onConfirm={() => deleteEventPhoto(p.id)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Ajoutez plusieurs photos à la fois ; elles sont redimensionnées automatiquement.</p>
        )}
      </section>

      <QuotesSection eventId={eventId} quotes={quotes} />
    </div>
  );
}

function QuotesSection({ eventId, quotes }: { eventId: string; quotes: QuoteItem[] }) {
  const form = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await addQuote(eventId, prev, fd);
    if (r.ok) {
      toast.success(r.message ?? "Ajouté");
      form.current?.reset();
    } else if (r.error) toast.error(r.error);
    return r;
  }, {});
  const err = (f: string) => state.fieldErrors?.[f]?.[0];
  return (
    <section className="grid gap-3">
      <h3 className="text-sm font-medium">Témoignages de participants ({quotes.length})</h3>
      {quotes.length > 0 && (
        <ul className="grid gap-2">
          {quotes.map((q) => (
            <li key={q.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
              <Quote className="mt-0.5 size-4 shrink-0 text-gold" />
              <div className="flex-1">
                <p className="italic">« {q.text} »</p>
                {q.author && <p className="mt-1 text-xs text-muted-foreground">{q.author}</p>}
              </div>
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Supprimer le témoignage">
                    <Trash2 />
                  </Button>
                }
                title="Supprimer ce témoignage ?"
                description="Il disparaît du CRM et du site."
                onConfirm={() => deleteQuote(q.id)}
              />
            </li>
          ))}
        </ul>
      )}
      <form ref={form} action={formAction} className="grid gap-3 rounded-lg border border-dashed p-3 sm:grid-cols-[1fr_220px_auto] sm:items-end">
        <FormField label="Témoignage" htmlFor="quote-text" error={err("text")}>
          <Textarea id="quote-text" name="text" rows={2} />
        </FormField>
        <FormField label="Signé" htmlFor="quote-author" error={err("author")}>
          <Input id="quote-author" name="author" placeholder="ex. Participante, RH" />
        </FormField>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Ajouter
        </Button>
      </form>
    </section>
  );
}
