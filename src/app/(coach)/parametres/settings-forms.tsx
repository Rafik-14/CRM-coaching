"use client";

import { useActionState, useState, useTransition } from "react";
import { ArchiveRestore, ArrowDown, ArrowUp, Archive, Check, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormField } from "@/components/form-field";
import { StageBadge, stageDot } from "@/components/stage-badge";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { STAGE_COLORS } from "@/lib/validations/phase1";
import { SESSION_LOCATIONS, SESSION_TYPES } from "@/lib/validations/coaching";
import { BUFFERS, SLOT_LENGTHS, WEEKDAYS, formatRanges, type BookingSettings } from "@/lib/booking";
import { saveBookingSettings } from "@/server/actions/booking";
import { saveEmailSettings, sendTestEmail } from "@/server/actions/email";
import {
  deleteNoteTemplate,
  deleteStage,
  moveStage,
  saveBusiness,
  saveNoteTemplate,
  savePackage,
  saveStage,
  setPackageActive,
} from "@/server/actions/settings";
import type { ActionState } from "@/server/actions/coaching";

const colorLabel: Record<(typeof STAGE_COLORS)[number], string> = {
  slate: "Gris",
  blue: "Bleu clair",
  amber: "Or",
  emerald: "Teal",
  violet: "Bleu nuit",
  rose: "Rouge",
};

/** useActionState wrapper: toast + close on success. */
function useSave(
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>,
  success: string,
  onDone?: () => void,
) {
  return useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await action(prev, fd);
    if (r.ok) {
      toast.success(r.message ?? success);
      onDone?.();
    } else if (r.error) toast.error(r.error);
    return r;
  }, {});
}

// ------------------------------------------------------------------ pipeline stages

type Stage = { id: string; name: string; color: string; isClient: boolean };

export function StagesEditor({ stages }: { stages: Stage[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid gap-3">
      <ol className="grid gap-2">
        {stages.map((s, i) => (
          <li key={s.id} className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5 text-sm">
            <span className="w-5 text-right text-muted-foreground tabular-nums">{i + 1}</span>
            <StageBadge name={s.name} color={s.color} />
            {s.isClient && <span className="text-xs text-muted-foreground">→ devient client</span>}
            <div className="ml-auto flex items-center">
              {pending && <Loader2 className="mr-1 size-4 animate-spin text-muted-foreground" />}
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={i === 0 || pending}
                aria-label={`Monter ${s.name}`}
                onClick={() => startTransition(() => moveStage(s.id, "up"))}
              >
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={i === stages.length - 1 || pending}
                aria-label={`Descendre ${s.name}`}
                onClick={() => startTransition(() => moveStage(s.id, "down"))}
              >
                <ArrowDown />
              </Button>
              <StageDialog stage={s} />
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={`Supprimer ${s.name}`}>
                    <Trash2 />
                  </Button>
                }
                title={`Supprimer l'étape « ${s.name} » ?`}
                description="Possible uniquement si aucun contact n'est à cette étape."
                successMessage="Étape supprimée"
                onConfirm={() => deleteStage(s.id)}
              />
            </div>
          </li>
        ))}
      </ol>
      <StageDialog />
    </div>
  );
}

function StageDialog({ stage }: { stage?: Stage }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useSave(
    (prev, fd) => saveStage(stage?.id ?? null, prev, fd),
    stage ? "Étape mise à jour" : "Étape ajoutée",
    () => setOpen(false),
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {stage ? (
          <Button variant="ghost" size="icon" className="size-8" aria-label={`Modifier ${stage.name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="justify-self-start">
            <Plus /> Ajouter une étape
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{stage ? "Modifier l'étape" : "Nouvelle étape"}</DialogTitle>
          <DialogDescription>Les étapes forment les colonnes du pipeline.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <FormField label="Nom *" htmlFor="stage-name" error={state.fieldErrors?.name?.[0]}>
            <Input id="stage-name" name="name" defaultValue={stage?.name} />
          </FormField>
          <FormField label="Couleur" htmlFor="stage-color">
            <Select name="color" defaultValue={stage?.color ?? "slate"}>
              <SelectTrigger id="stage-color" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGE_COLORS.map((c) => (
                  <SelectItem key={c} value={c}>
                    <span className={cn("size-2.5 rounded-full", stageDot[c])} />
                    {colorLabel[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
            <input type="checkbox" name="isClient" defaultChecked={stage?.isClient} className="mt-0.5 size-4 accent-primary" />
            <span>
              <span className="font-medium">Étape « client »</span>
              <span className="block text-muted-foreground">
                Un contact placé ici devient client (séances, accompagnements, objectifs, documents).
              </span>
            </span>
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------ offers (« accompagnements »)

export type Pkg = {
  id: string;
  name: string;
  sessionsCount: number;
  price: string;
  priceChf: string | null;
  active: boolean;
  position: number;
  tagline: string | null;
  description: string | null;
  includes: string[];
  goalPresets: string[];
  noteTemplateId: string | null;
};
type TemplateOption = { id: string; name: string };

export function PackagesEditor({ packages, templates }: { packages: Pkg[]; templates: TemplateOption[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {packages.map((p) => (
          <article
            key={p.id}
            className={cn("flex flex-col rounded-xl border border-border bg-card p-5", !p.active && "opacity-60")}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs tracking-[0.16em] text-muted-foreground tabular-nums">
                  {String(p.position || 0).padStart(2, "0")}
                  {!p.active && <span className="ml-2 tracking-normal">· archivé</span>}
                </p>
                <span aria-hidden className="mt-1.5 block h-0.5 w-6 rounded-full bg-gold" />
              </div>
              <div className="-mt-1 -mr-1 flex">
                <PackageDialog pkg={p} templates={templates} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground"
                  disabled={pending}
                  aria-label={p.active ? `Archiver ${p.name}` : `Réactiver ${p.name}`}
                  title={p.active ? "Archiver (n'est plus proposé)" : "Réactiver"}
                  onClick={() =>
                    startTransition(async () => {
                      await setPackageActive(p.id, !p.active);
                      toast.success(p.active ? "Accompagnement archivé" : "Accompagnement réactivé");
                    })
                  }
                >
                  {p.active ? <Archive /> : <ArchiveRestore />}
                </Button>
              </div>
            </div>
            <h3 className="mt-3 text-base font-semibold">{p.name}</h3>
            {p.tagline && <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>}
            <p className="mt-3 font-heading text-lg font-semibold text-heading tabular-nums">
              {formatMoney(p.price, "EUR")}
              {p.priceChf != null && <span> · {formatMoney(p.priceChf, "CHF")}</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              {p.sessionsCount} séance{p.sessionsCount > 1 ? "s" : ""}
            </p>
            {p.includes.length > 0 && (
              <ul className="mt-3 grid gap-1 text-sm">
                {p.includes.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" strokeWidth={2} /> {item}
                  </li>
                ))}
              </ul>
            )}
            {p.goalPresets.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Objectifs créés à la vente : {p.goalPresets.join(" · ")}
              </p>
            )}
          </article>
        ))}
      </div>
      <PackageDialog templates={templates} />
    </div>
  );
}

function PackageDialog({ pkg, templates }: { pkg?: Pkg; templates: TemplateOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useSave(
    (prev, fd) => savePackage(pkg?.id ?? null, prev, fd),
    pkg ? "Accompagnement mis à jour" : "Accompagnement ajouté",
    () => setOpen(false),
  );
  const err = (f: string) => state.fieldErrors?.[f]?.[0];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {pkg ? (
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={`Modifier ${pkg.name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="justify-self-start">
            <Plus /> Ajouter un accompagnement
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{pkg ? "Modifier l'accompagnement" : "Nouvel accompagnement"}</DialogTitle>
          <DialogDescription>Une offre proposée à vos clients, avec son prix en euros et en francs suisses.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <div className="grid grid-cols-[1fr_5rem] gap-4">
            <FormField label="Nom *" htmlFor="pkg-name" error={err("name")}>
              <Input id="pkg-name" name="name" defaultValue={pkg?.name} placeholder="ex. Accompagnement Décisif JG®" />
            </FormField>
            <FormField label="Ordre" htmlFor="pkg-position" error={err("position")}>
              <Input id="pkg-position" name="position" type="number" min={0} max={99} defaultValue={pkg?.position ?? ""} />
            </FormField>
          </div>
          <FormField label="Accroche" htmlFor="pkg-tagline" error={err("tagline")}>
            <Input id="pkg-tagline" name="tagline" defaultValue={pkg?.tagline ?? ""} placeholder="ex. Réussir un moment qui compte." />
          </FormField>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Séances *" htmlFor="pkg-sessions" error={err("sessionsCount")}>
              <Input id="pkg-sessions" name="sessionsCount" type="number" min={1} defaultValue={pkg?.sessionsCount ?? 1} />
            </FormField>
            <FormField label="Prix (€) *" htmlFor="pkg-price" error={err("price")}>
              <Input id="pkg-price" name="price" type="number" min={0} step={10} defaultValue={pkg ? Number(pkg.price) : ""} />
            </FormField>
            <FormField label="Prix (CHF)" htmlFor="pkg-price-chf" error={err("priceChf")}>
              <Input
                id="pkg-price-chf"
                name="priceChf"
                type="number"
                min={0}
                step={10}
                defaultValue={pkg?.priceChf != null ? Number(pkg.priceChf) : ""}
              />
            </FormField>
          </div>
          <FormField label="Description" htmlFor="pkg-description" error={err("description")}>
            <Textarea id="pkg-description" name="description" rows={2} defaultValue={pkg?.description ?? ""} />
          </FormField>
          <FormField label="Inclus (un élément par ligne)" htmlFor="pkg-includes" error={err("includes")}>
            <Textarea
              id="pkg-includes"
              name="includes"
              rows={3}
              defaultValue={pkg?.includes.join("\n")}
              placeholder={"Workbook Signature JG®\nExercices entre les séances"}
            />
          </FormField>
          <FormField
            label="Objectifs créés à la vente (un par ligne)"
            htmlFor="pkg-goals"
            error={err("goalPresets")}
            hint="Ajoutés automatiquement à la fiche du client quand cet accompagnement lui est attribué."
          >
            <Textarea
              id="pkg-goals"
              name="goalPresets"
              rows={3}
              defaultValue={pkg?.goalPresets.join("\n")}
              placeholder={"Identité\nValeur\nPositionnement"}
            />
          </FormField>
          <FormField label="Modèle de note des séances" htmlFor="pkg-template">
            <Select name="noteTemplateId" defaultValue={pkg?.noteTemplateId ?? "none"}>
              <SelectTrigger id="pkg-template" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Modèle par défaut</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------ note template & business

type Template = { id: string; name: string; fields: string[]; isDefault: boolean; sessionType: string | null };

/** Several templates: one per offer / session type (Méthode JG®), one default. */
export function NoteTemplatesEditor({ templates }: { templates: Template[] }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((t) => (
          <article key={t.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold">{t.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.isDefault ? "Par défaut" : "Modèle"}
                  {t.sessionType && ` · séances « ${t.sessionType} »`}
                </p>
              </div>
              <div className="-mt-1 -mr-1 flex">
                <NoteTemplateDialog template={t} />
                {!t.isDefault && (
                  <ConfirmDialog
                    title={`Supprimer « ${t.name} » ?`}
                    description="Les notes déjà écrites ne changent pas. Les accompagnements qui l'utilisaient passeront au modèle par défaut."
                    confirmLabel="Supprimer"
                    successMessage="Modèle supprimé"
                    onConfirm={() => deleteNoteTemplate(t.id)}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground"
                        aria-label={`Supprimer ${t.name}`}
                      >
                        <Trash2 />
                      </Button>
                    }
                  />
                )}
              </div>
            </div>
            <ol className="mt-3 grid gap-1 text-sm">
              {t.fields.map((f, i) => (
                <li key={f} className="flex gap-2">
                  <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  {f}
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
      <NoteTemplateDialog />
    </div>
  );
}

function NoteTemplateDialog({ template }: { template?: Template }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useSave(
    (prev, fd) => saveNoteTemplate(template?.id ?? null, prev, fd),
    template ? "Modèle mis à jour" : "Modèle ajouté",
    () => setOpen(false),
  );
  const err = (f: string) => state.fieldErrors?.[f]?.[0];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {template ? (
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={`Modifier ${template.name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="justify-self-start">
            <Plus /> Ajouter un modèle
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{template ? "Modifier le modèle" : "Nouveau modèle de note"}</DialogTitle>
          <DialogDescription>Les rubriques proposées dans la note de séance. Les notes déjà écrites ne changent pas.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <FormField label="Nom *" htmlFor="tpl-name" error={err("name")}>
            <Input id="tpl-name" name="name" defaultValue={template?.name} placeholder="ex. Parcours Signature JG®" />
          </FormField>
          <FormField
            label="Rubriques (une par ligne) *"
            htmlFor="tpl-fields"
            error={err("fields")}
            hint="Une rubrique qui commence par « Exercices » propose de créer une tâche de suivi."
          >
            <Textarea id="tpl-fields" name="fields" rows={7} defaultValue={template?.fields.join("\n")} />
          </FormField>
          <FormField
            label="Utilisé automatiquement pour les séances de type"
            htmlFor="tpl-type"
            hint="Sinon : le modèle de l'accompagnement du client, puis le modèle par défaut."
          >
            <Select name="sessionType" defaultValue={template?.sessionType ?? "none"}>
              <SelectTrigger id="tpl-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun type en particulier</SelectItem>
                {SESSION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" name="isDefault" defaultChecked={template?.isDefault} className="size-4 accent-[var(--primary)]" />
            Modèle par défaut
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BusinessForm({ name, currency }: { name: string; currency: string }) {
  const [state, formAction, pending] = useSave(saveBusiness, "Informations enregistrées");
  return (
    <form action={formAction} className="grid gap-4">
      <FormField label="Nom de l'activité" htmlFor="biz-name" error={state.fieldErrors?.name?.[0]}>
        <Input id="biz-name" name="name" defaultValue={name === "—" ? "" : name} />
      </FormField>
      <FormField
        label="Devise par défaut"
        htmlFor="biz-currency"
        hint="Pour les nouveaux contacts. Chaque contact peut ensuite être en euros ou en francs suisses."
      >
        <Select name="currency" defaultValue={currency}>
          <SelectTrigger id="biz-currency" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EUR">Euro (€)</SelectItem>
            <SelectItem value="CHF">Franc suisse (CHF)</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending && <Loader2 className="animate-spin" />}
        Enregistrer
      </Button>
    </form>
  );
}

// ------------------------------------------------------------------ online booking (website)

export function BookingSettingsForm({ settings }: { settings: BookingSettings }) {
  const [state, formAction, pending] = useSave(saveBookingSettings, "Disponibilités enregistrées");
  const errors = state.fieldErrors;
  return (
    <form action={formAction} className="grid gap-6">
      <label className="flex items-center gap-3 text-sm font-medium">
        <input type="checkbox" name="enabled" defaultChecked={settings.enabled} className="size-4 accent-primary" />
        Réservation en ligne ouverte sur le site
      </label>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-medium">Plages horaires par jour</legend>
        <p className="-mt-1 text-xs text-muted-foreground">
          Format : 09:00-12:00, 14:00-18:00. Laissez vide pour un jour sans rendez-vous.
        </p>
        {WEEKDAYS.map((d) => (
          <div key={d.index} className="grid gap-1 sm:grid-cols-[110px_1fr] sm:items-center">
            <label htmlFor={`day${d.index}`} className="text-sm">
              {d.label}
            </label>
            <Input
              id={`day${d.index}`}
              name={`day${d.index}`}
              defaultValue={formatRanges(settings.weekly[d.index] ?? [])}
              placeholder="Pas de rendez-vous"
              aria-invalid={!!errors?.[`day${d.index}`] || undefined}
            />
            {errors?.[`day${d.index}`] && (
              <p className="text-xs text-destructive sm:col-start-2">{errors[`day${d.index}`]?.[0]}</p>
            )}
          </div>
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FormField label="Durée de l'échange" htmlFor="slotMinutes">
          <Select name="slotMinutes" defaultValue={String(settings.slotMinutes)}>
            <SelectTrigger id="slotMinutes" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SLOT_LENGTHS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} minutes
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Pause avant / après" htmlFor="bufferMinutes" hint="Temps libre gardé autour de chaque rendez-vous.">
          <Select name="bufferMinutes" defaultValue={String(settings.bufferMinutes)}>
            <SelectTrigger id="bufferMinutes" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUFFERS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n === 0 ? "Aucune" : `${n} minutes`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Lieu" htmlFor="location">
          <Select name="location" defaultValue={settings.location}>
            <SelectTrigger id="location" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SESSION_LOCATIONS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField
          label="Délai minimum (heures)"
          htmlFor="minNoticeHours"
          hint="Pas de réservation moins de … heures à l'avance."
          error={errors?.minNoticeHours?.[0]}
        >
          <Input id="minNoticeHours" name="minNoticeHours" type="number" min={0} max={336} defaultValue={settings.minNoticeHours} />
        </FormField>
        <FormField
          label="Réservable jusqu'à (jours)"
          htmlFor="horizonDays"
          hint="Combien de jours à l'avance."
          error={errors?.horizonDays?.[0]}
        >
          <Input id="horizonDays" name="horizonDays" type="number" min={1} max={120} defaultValue={settings.horizonDays} />
        </FormField>
        <FormField
          label="Annulation possible jusqu'à (heures)"
          htmlFor="cancellationHours"
          hint="Avant ce délai, le lien des e-mails permet d'annuler ou de déplacer. Après, vos coordonnées s'affichent."
          error={errors?.cancellationHours?.[0]}
        >
          <Input id="cancellationHours" name="cancellationHours" type="number" min={0} max={168} defaultValue={settings.cancellationHours} />
        </FormField>
      </div>

      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending && <Loader2 className="animate-spin" />}
        Enregistrer
      </Button>
    </form>
  );
}

// ------------------------------------------------------------------ e-mails

export function EmailNotifyForm({
  notifyTo,
  fallback,
  reminder24h,
  reminder1h,
}: {
  notifyTo: string | null;
  fallback: string | null;
  reminder24h: boolean;
  reminder1h: boolean;
}) {
  const [state, formAction, pending] = useSave(saveEmailSettings, "Réglages enregistrés");
  return (
    <form action={formAction} className="grid gap-4">
      <FormField
        label="Adresse qui reçoit les notifications"
        htmlFor="notifyTo"
        hint={`Nouvelles réservations et nouveaux messages du site. Vide = adresse de votre compte${fallback ? ` (${fallback})` : ""}.`}
        error={state.fieldErrors?.notifyTo?.[0]}
      >
        <Input id="notifyTo" name="notifyTo" type="email" defaultValue={notifyTo ?? ""} placeholder={fallback ?? ""} />
      </FormField>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Rappels de rendez-vous</legend>
        <p className="-mt-1 mb-1 text-xs text-muted-foreground">
          Envoyés automatiquement à la personne pour chaque séance prévue, avec un lien pour déplacer ou annuler.
        </p>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="reminder24h" defaultChecked={reminder24h} className="size-4 accent-primary" />
          Rappel la veille (24 h avant)
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="reminder1h" defaultChecked={reminder1h} className="size-4 accent-primary" />
          Rappel 1 h avant
        </label>
      </fieldset>
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending && <Loader2 className="animate-spin" />}
        Enregistrer
      </Button>
    </form>
  );
}

export function TestEmailForm({ defaultTo }: { defaultTo: string | null }) {
  const [state, formAction, pending] = useSave(sendTestEmail, "E-mail de test envoyé");
  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
      <FormField label="Envoyer un e-mail de test à" htmlFor="test-to" error={state.fieldErrors?.to?.[0]}>
        <Input id="test-to" name="to" type="email" defaultValue={defaultTo ?? ""} required />
      </FormField>
      <Button type="submit" disabled={pending} variant="outline">
        {pending && <Loader2 className="animate-spin" />}
        Envoyer le test
      </Button>
    </form>
  );
}
