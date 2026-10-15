"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2, Mail, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import { cancelScheduledEmail, getEmailDraft, sendContactEmail } from "@/server/actions/contact-email";
import type { ActionState } from "@/server/actions/coaching";
import type { TemplateKey } from "@/lib/email-templates";

type Draft = { subject: string; heading: string; body: string };

/** Contact file › « E-mail »: start from a model (filled for this contact) or a blank message, edit, send. */
export function SendEmailDialog({
  contactId,
  email,
  templates,
}: {
  contactId: string;
  email: string | null;
  templates: { key: TemplateKey; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<string>("libre");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [loading, startLoading] = useTransition();
  const [state, formAction, sending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await sendContactEmail(contactId, prev, fd);
    if (r.ok) {
      toast.success(r.message ?? "E-mail envoyé");
      setOpen(false);
    } else if (r.error) toast.error(r.error);
    return r;
  }, {});

  const load = (key: string) =>
    startLoading(async () => {
      setChoice(key);
      const d = await getEmailDraft(contactId, key as TemplateKey | "libre");
      setDraft(d);
      setFormKey((k) => k + 1);
    });
  const e = state.fieldErrors;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) load("libre");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" disabled={!email} title={email ? undefined : "Ajoutez d’abord une adresse e-mail"}>
          <Mail /> E-mail
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Envoyer un e-mail</DialogTitle>
          <DialogDescription>À {email} · mis en page aux couleurs JG® et visible dans l’historique.</DialogDescription>
        </DialogHeader>
        <FormField label="Partir de" htmlFor="email-model">
          <Select value={choice} onValueChange={load}>
            <SelectTrigger id="email-model" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="libre">Message libre</SelectItem>
              {templates.map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        {draft && (
          <form key={formKey} action={formAction} className="grid gap-4">
            <input type="hidden" name="template" value={choice} />
            <FormField label="Objet" htmlFor="mail-subject" error={e?.subject?.[0]}>
              <Input id="mail-subject" name="subject" defaultValue={draft.subject} />
            </FormField>
            <FormField label="Titre" htmlFor="mail-heading" error={e?.heading?.[0]}>
              <Input id="mail-heading" name="heading" defaultValue={draft.heading} />
            </FormField>
            <FormField label="Message" htmlFor="mail-body" hint="Une ligne vide sépare deux paragraphes. Votre signature est ajoutée." error={e?.body?.[0]}>
              <Textarea id="mail-body" name="body" rows={10} defaultValue={draft.body} />
            </FormField>
            <Button type="submit" disabled={sending || loading} className="justify-self-start">
              {(sending || loading) && <Loader2 className="animate-spin" />}
              Envoyer
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Contact file: automatic e-mails waiting to go out, with « Annuler ». */
export function ScheduledEmailsList({ items }: { items: { id: string; label: string; when: string }[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <ul className="grid gap-2 text-sm">
      {items.map((i) => (
        <li key={i.id} className="flex items-center justify-between gap-2">
          <span className="min-w-0">
            <span className="block truncate font-medium">{i.label}</span>
            <span className="text-xs text-muted-foreground first-letter:uppercase">{i.when}</span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Annuler : ${i.label}`}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await cancelScheduledEmail(i.id);
                if (r.error) toast.error(r.error);
                else toast.success("E-mail annulé");
              })
            }
          >
            <X />
          </Button>
        </li>
      ))}
    </ul>
  );
}
