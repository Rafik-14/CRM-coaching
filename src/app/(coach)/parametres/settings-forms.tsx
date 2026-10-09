"use client";

import { useActionState, useState, useTransition } from "react";
import { ArchiveRestore, ArrowDown, ArrowUp, Archive, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
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
  blue: "Bleu",
  amber: "Ambre",
  emerald: "Vert",
  violet: "Violet",
  rose: "Rose",
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
      toast.success(success);
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
                Un contact placé ici devient client (séances, forfaits, objectifs, documents).
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

// ------------------------------------------------------------------ packages

type Pkg = { id: string; name: string; sessionsCount: number; price: string; currency: string; active: boolean };

export function PackagesEditor({ packages }: { packages: Pkg[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {packages.map((p) => (
          <div key={p.id} className={cn("rounded-xl border border-border bg-muted/40 p-4", !p.active && "opacity-60")}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {p.name}
                {!p.active && <span className="ml-1.5 text-xs">(archivé)</span>}
              </p>
              <div className="-mt-1 -mr-1 flex">
                <PackageDialog pkg={p} />
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
                      toast.success(p.active ? "Forfait archivé" : "Forfait réactivé");
                    })
                  }
                >
                  {p.active ? <Archive /> : <ArchiveRestore />}
                </Button>
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-primary tabular-nums">{formatMoney(p.price, p.currency)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {p.sessionsCount} séance{p.sessionsCount > 1 ? "s" : ""}
            </p>
          </div>
        ))}
      </div>
      <PackageDialog />
    </div>
  );
}

function PackageDialog({ pkg }: { pkg?: Pkg }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useSave(
    (prev, fd) => savePackage(pkg?.id ?? null, prev, fd),
    pkg ? "Forfait mis à jour" : "Forfait ajouté",
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
            <Plus /> Ajouter un forfait
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pkg ? "Modifier le forfait" : "Nouveau forfait"}</DialogTitle>
          <DialogDescription>Un pack de séances proposé à vos clients.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <FormField label="Nom *" htmlFor="pkg-name" error={err("name")}>
            <Input id="pkg-name" name="name" defaultValue={pkg?.name} placeholder="ex. Accompagnement 3 mois" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Séances *" htmlFor="pkg-sessions" error={err("sessionsCount")}>
              <Input id="pkg-sessions" name="sessionsCount" type="number" min={1} defaultValue={pkg?.sessionsCount ?? 1} />
            </FormField>
            <FormField label="Prix *" htmlFor="pkg-price" error={err("price")}>
              <Input id="pkg-price" name="price" type="number" min={0} step={10} defaultValue={pkg ? Number(pkg.price) : ""} />
            </FormField>
          </div>
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

export function NoteTemplateForm({ fields }: { fields: string[] }) {
  const [state, formAction, pending] = useSave(saveNoteTemplate, "Modèle de note enregistré");
  return (
    <form action={formAction} className="grid gap-3">
      <FormField
        label="Rubriques (une par ligne)"
        htmlFor="fields"
        error={state.fieldErrors?.fields?.[0]}
        hint="Elles apparaissent dans chaque note de séance. Les notes déjà écrites ne changent pas."
      >
        <Textarea id="fields" name="fields" rows={6} defaultValue={fields.join("\n")} />
      </FormField>
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending && <Loader2 className="animate-spin" />}
        Enregistrer
      </Button>
    </form>
  );
}

export function BusinessForm({ name, currency }: { name: string; currency: string }) {
  const [state, formAction, pending] = useSave(saveBusiness, "Informations enregistrées");
  return (
    <form action={formAction} className="grid gap-4">
      <FormField label="Nom de l'activité" htmlFor="biz-name" error={state.fieldErrors?.name?.[0]}>
        <Input id="biz-name" name="name" defaultValue={name === "—" ? "" : name} />
      </FormField>
      <FormField label="Devise" htmlFor="biz-currency">
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
