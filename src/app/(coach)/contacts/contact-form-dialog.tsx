"use client";

import { useActionState, useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createContact, updateContact, type FormState } from "@/server/actions/contacts";

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  stageId: string | null;
  estimatedValue: string | null;
  tags: string[];
  notes: string | null;
};

const SOURCES = ["Site web", "Instagram", "Recommandation", "LinkedIn", "Conférence", "Bouche-à-oreille"];

export function ContactFormDialog({
  stages,
  contact,
  triggerClassName,
}: {
  stages: { id: string; name: string }[];
  contact?: Contact;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = contact
      ? await updateContact(contact.id, prev, formData)
      : await createContact(prev, formData);
    if (result.ok) {
      setOpen(false);
      toast.success(contact ? "Contact mis à jour" : "Contact ajouté");
    } else if (result.error) {
      toast.error(result.error);
    }
    return result;
  }, {});

  const err = (field: string) => state.fieldErrors?.[field]?.[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {contact ? (
          <Button variant="outline" className={triggerClassName}>
            <Pencil /> Modifier
          </Button>
        ) : (
          <Button className={triggerClassName}>
            <Plus /> Nouveau contact
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{contact ? "Modifier le contact" : "Nouveau contact"}</DialogTitle>
          <DialogDescription>Seul le prénom est obligatoire.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4" key={open ? "open" : "closed"}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom *" name="firstName" defaultValue={contact?.firstName} error={err("firstName")} />
            <Field label="Nom" name="lastName" defaultValue={contact?.lastName} error={err("lastName")} />
            <Field label="E-mail" name="email" type="email" defaultValue={contact?.email} error={err("email")} />
            <Field label="Téléphone" name="phone" type="tel" defaultValue={contact?.phone} error={err("phone")} />
            <div className="grid gap-2">
              <Label htmlFor="stageId">Étape</Label>
              <Select name="stageId" defaultValue={contact?.stageId ?? stages[0]?.id}>
                <SelectTrigger id="stageId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="source">Source</Label>
              <Input id="source" name="source" list="sources" defaultValue={contact?.source ?? ""} />
              <datalist id="sources">
                {SOURCES.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Valeur estimée (€)"
              name="estimatedValue"
              type="number"
              min={0}
              step={10}
              inputMode="decimal"
              defaultValue={contact?.estimatedValue ? String(Number(contact.estimatedValue)) : ""}
              error={err("estimatedValue")}
              placeholder="ex. 450"
            />
            <Field
              label="Tags (séparés par des virgules)"
              name="tags"
              defaultValue={contact?.tags.join(", ")}
              placeholder="ex. reconversion, stress"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={contact?.notes ?? ""} />
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

function Field({
  label,
  name,
  error,
  defaultValue,
  ...props
}: {
  label: string;
  name: string;
  error?: string;
  defaultValue?: string | null;
} & Omit<React.ComponentProps<typeof Input>, "defaultValue">) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue ?? ""} aria-invalid={!!error} {...props} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
