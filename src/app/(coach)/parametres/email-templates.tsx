"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Loader2, Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormField } from "@/components/form-field";
import { cn } from "@/lib/utils";
import { VARIABLES, type TemplateDef, type TemplateKey, type TemplateText } from "@/lib/email-templates";
import { previewEmailTemplate, resetEmailTemplate, saveEmailTemplate, setEmailTemplateEnabled } from "@/server/actions/email-templates";
import type { ActionState } from "@/server/actions/coaching";

export type TemplateRow = { key: TemplateKey; def: TemplateDef; text: TemplateText; enabled: boolean; customized: boolean };

/** Paramètres › E-mails › « E-mails automatiques »: turn each one on / off, reword it, preview it. */
export function EmailTemplates({ templates }: { templates: TemplateRow[] }) {
  return (
    <ul className="divide-y divide-border">
      {templates.map((t) => (
        <TemplateItem key={t.key} template={t} />
      ))}
    </ul>
  );
}

function TemplateItem({ template: t }: { template: TemplateRow }) {
  const [pending, startTransition] = useTransition();
  const toggle = () =>
    startTransition(async () => {
      await setEmailTemplateEnabled(t.key, !t.enabled);
      toast.success(t.enabled ? "E-mail désactivé" : "E-mail activé");
    });

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {t.def.label}
          {t.customized && <span className="rounded-md bg-info/10 px-1.5 py-0.5 text-[11px] font-medium text-info">Texte modifié</span>}
          {!t.def.essential && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground" title="Pas envoyé aux contacts qui ont refusé ces e-mails">
              Facultatif
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">{t.def.trigger}</p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={t.enabled}
          disabled={pending}
          onChange={toggle}
          className="size-4 accent-primary"
          aria-label={`${t.def.label} : ${t.enabled ? "activé" : "désactivé"}`}
        />
        <span className={cn(!t.enabled && "text-muted-foreground")}>{t.enabled ? "Activé" : "Désactivé"}</span>
      </label>
      <TemplateDialog template={t} />
    </li>
  );
}

function TemplateDialog({ template: t }: { template: TemplateRow }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<TemplateText>(t.text);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [loading, setLoading] = useState(false);
  /** Field where {{variables}} are inserted: the last one focused. */
  const [target, setTarget] = useState<keyof TemplateText>("body");
  const [state, formAction, saving] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await saveEmailTemplate(t.key, prev, fd);
    if (r.ok) {
      toast.success("E-mail enregistré");
      setOpen(false);
    } else if (r.error) toast.error(r.error);
    return r;
  }, {});

  // Live preview, a moment after the last keystroke.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const p = await previewEmailTemplate(t.key, text);
        if (!cancelled) setPreview(p);
      } catch {
        // Invalid while typing (too long…): keep the last preview.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, t.key, text]);

  /** Inserts {{variable}} where the cursor was in the last focused field (the text by default). */
  const insert = (name: string) => {
    const el = document.getElementById(`${t.key}-${target}`) as HTMLInputElement | HTMLTextAreaElement | null;
    const value = text[target];
    const at = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? at;
    setText({ ...text, [target]: value.slice(0, at) + `{{${name}}}` + value.slice(end) });
  };
  const e = state.fieldErrors;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setText(t.text);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil /> Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{t.def.label}</DialogTitle>
          <DialogDescription>{t.def.trigger}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <form action={formAction} className="grid content-start gap-4">
            <FormField label="Objet" htmlFor={`${t.key}-subject`} error={e?.subject?.[0]}>
              <Input
                id={`${t.key}-subject`}
                name="subject"
                value={text.subject}
                onChange={(ev) => setText({ ...text, subject: ev.target.value })}
                onFocus={() => setTarget("subject")}
              />
            </FormField>
            <FormField label="Titre" htmlFor={`${t.key}-heading`} error={e?.heading?.[0]}>
              <Input
                id={`${t.key}-heading`}
                name="heading"
                value={text.heading}
                onChange={(ev) => setText({ ...text, heading: ev.target.value })}
                onFocus={() => setTarget("heading")}
              />
            </FormField>
            <FormField
              label="Texte"
              htmlFor={`${t.key}-body`}
              hint="Une ligne vide sépare deux paragraphes. Les liens deviennent cliquables."
              error={e?.body?.[0]}
            >
              <Textarea
                id={`${t.key}-body`}
                name="body"
                rows={10}
                value={text.body}
                onChange={(ev) => setText({ ...text, body: ev.target.value })}
                onFocus={() => setTarget("body")}
              />
            </FormField>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Insérer une information (là où se trouve le curseur) :</p>
              <div className="flex flex-wrap gap-1.5">
                {t.def.variables.map((v) => (
                  <button
                    key={v}
                    type="button"
                    title={VARIABLES[v]}
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => insert(v)}
                    className="rounded-md border border-border px-2 py-1 font-mono text-[11px] hover:bg-muted"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                Enregistrer
              </Button>
              {t.customized && (
                <ConfirmDialog
                  trigger={
                    <Button type="button" variant="ghost">
                      <RotateCcw /> Rétablir le texte d’origine
                    </Button>
                  }
                  title="Rétablir le texte d’origine ?"
                  description="Votre version de cet e-mail sera remplacée par le texte proposé au départ."
                  confirmLabel="Rétablir"
                  successMessage="Texte d’origine rétabli"
                  onConfirm={async () => {
                    await resetEmailTemplate(t.key);
                    setOpen(false);
                  }}
                />
              )}
            </div>
          </form>
          <div className="grid content-start gap-2">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              Aperçu avec un exemple {loading && <Loader2 className="size-3 animate-spin" />}
            </p>
            {preview && (
              <>
                <p className="truncate rounded-lg bg-muted px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Objet : </span>
                  {preview.subject}
                </p>
                <iframe
                  title="Aperçu de l’e-mail"
                  srcDoc={preview.html}
                  sandbox=""
                  className="h-[560px] w-full rounded-lg border border-border bg-white"
                />
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
