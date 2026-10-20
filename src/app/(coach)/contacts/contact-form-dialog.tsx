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
import { COUNTRIES, SEGMENTS, STAKES, SUB_SEGMENTS } from "@/lib/jg";
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
  segment: string | null;
  subSegment: string | null;
  organization: string | null;
  referredByContactId: string | null;
  country: string | null;
  currency: string;
  stake: string | null;
  keyMomentAt: Date | null;
  emailOptOut?: boolean;
};

const SOURCES = ["Site web", "LinkedIn", "Recommandation", "Partenaire", "Conférence / atelier", "Le Chant du Merle", "Bouche-à-oreille"];

/** Radix Select needs a non-empty value for the empty option; the server maps it to null. */
const NONE = "none";

export function ContactFormDialog({
  stages,
  partners,
  defaultCurrency,
  contact,
  triggerClassName,
}: {
  stages: { id: string; name: string }[];
  /** HR firms, schools, companies that can refer contacts. */
  partners: { id: string; name: string }[];
  defaultCurrency: "EUR" | "CHF";
  contact?: Contact;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [segment, setSegment] = useState(contact?.segment ?? NONE);
  const [currency, setCurrency] = useState<string>(contact?.currency ?? defaultCurrency);
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
  const partnerOptions = partners.filter((p) => p.id !== contact?.id);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setSegment(contact?.segment ?? NONE);
          setCurrency(contact?.currency ?? defaultCurrency);
        }
      }}
    >
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
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{contact ? "Modifier le contact" : "Nouveau contact"}</DialogTitle>
          <DialogDescription>Seul le prénom est obligatoire.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-6" key={open ? "open" : "closed"}>
          <section className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom *" name="firstName" defaultValue={contact?.firstName} error={err("firstName")} />
            <Field label="Nom" name="lastName" defaultValue={contact?.lastName} error={err("lastName")} />
            <Field label="E-mail" name="email" type="email" defaultValue={contact?.email} error={err("email")} />
            <Field label="Téléphone" name="phone" type="tel" defaultValue={contact?.phone} error={err("phone")} />
            <label className="flex items-center gap-3 text-sm sm:col-span-2">
              <input type="checkbox" name="emailOptOut" defaultChecked={contact?.emailOptOut ?? false} className="size-4 accent-primary" />
              Ne souhaite pas recevoir les e-mails facultatifs (suivi, remerciements…)
            </label>
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
          </section>

          <section className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
            <SectionTitle>Profil</SectionTitle>
            <div className="grid gap-2">
              <Label htmlFor="segment">Type de client</Label>
              <Select name="segment" value={segment} onValueChange={setSegment}>
                <SelectTrigger id="segment" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Non précisé</SelectItem>
                  {SEGMENTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {segment === "particulier" ? (
              <div className="grid gap-2">
                <Label htmlFor="subSegment">Situation</Label>
                <Select name="subSegment" defaultValue={contact?.subSegment ?? NONE}>
                  <SelectTrigger id="subSegment" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Non précisée</SelectItem>
                    {SUB_SEGMENTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <Field
                label={segment === "ecole" ? "École / université" : segment === NONE ? "Organisation" : "Entreprise / cabinet"}
                name="organization"
                defaultValue={contact?.organization}
                error={err("organization")}
              />
            )}
            <div className="grid gap-2">
              <Label htmlFor="referredByContactId">Recommandé par</Label>
              <Select name="referredByContactId" defaultValue={contact?.referredByContactId ?? NONE}>
                <SelectTrigger id="referredByContactId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Personne</SelectItem>
                  {partnerOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {err("referredByContactId") && <p className="text-xs text-destructive">{err("referredByContactId")}</p>}
              {partnerOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">Ajoutez d&apos;abord un cabinet RH, une école ou une entreprise.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="country">Pays</Label>
                <Select
                  name="country"
                  defaultValue={contact?.country ?? NONE}
                  onValueChange={(v) => {
                    const c = COUNTRIES.find((x) => x.value === v);
                    if (c) setCurrency(c.currency);
                  }}
                >
                  <SelectTrigger id="country" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">Devise</Label>
                <Select name="currency" value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="CHF">CHF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
            <SectionTitle>Enjeu</SectionTitle>
            <div className="grid gap-2">
              <Label htmlFor="stake">Enjeu</Label>
              <Input id="stake" name="stake" list="stakes" defaultValue={contact?.stake ?? ""} placeholder="ex. Entretien, Reconversion" />
              <datalist id="stakes">
                {STAKES.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              {err("stake") && <p className="text-xs text-destructive">{err("stake")}</p>}
            </div>
            <Field
              label="Moment décisif (date)"
              name="keyMomentAt"
              type="date"
              defaultValue={contact?.keyMomentAt ? contact.keyMomentAt.toISOString().slice(0, 10) : ""}
              error={err("keyMomentAt")}
            />
            <Field
              label={`Valeur estimée (${currency === "CHF" ? "CHF" : "€"})`}
              name="estimatedValue"
              type="number"
              min={0}
              step={10}
              inputMode="decimal"
              defaultValue={contact?.estimatedValue ? String(Number(contact.estimatedValue)) : ""}
              error={err("estimatedValue")}
              placeholder="ex. 470"
            />
            <Field
              label="Tags (séparés par des virgules)"
              name="tags"
              defaultValue={contact?.tags.join(", ")}
              placeholder="ex. confiance, prise de poste"
            />
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} defaultValue={contact?.notes ?? ""} />
            </div>
          </section>

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase sm:col-span-2">{children}</p>
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
