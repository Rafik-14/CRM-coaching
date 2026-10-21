"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Download, Loader2, Mail, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormField } from "@/components/form-field";
import { addManualRegistration, coachCancelRegistration, messageAttendees, setAttendance } from "@/server/actions/events";
import type { ActionState } from "@/server/actions/coaching";
import { REGISTRATION_STATUS_LABEL, type RegistrationStatus } from "@/lib/events";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type RegistrationItem = {
  id: string;
  contactId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  company: string | null;
  seats: number;
  status: string;
  attended: boolean;
  source: string;
  createdAt: Date;
};

/** Attendee list of an event: presence on the day, cancel, add by hand, export, message everyone. */
export function RegistrationsPanel({
  eventId,
  registrations,
  started,
  cancelled,
}: {
  eventId: string;
  registrations: RegistrationItem[];
  started: boolean;
  cancelled: boolean;
}) {
  const [showCancelled, setShowCancelled] = useState(false);
  const active = registrations.filter((r) => r.status !== "cancelled");
  const confirmed = active.filter((r) => r.status === "confirmed");
  const waiting = active.filter((r) => r.status === "waitlist");
  const gone = registrations.filter((r) => r.status === "cancelled");

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {!cancelled && <AddRegistrationDialog eventId={eventId} />}
        {active.length > 0 && <MessageDialog eventId={eventId} hasWaitlist={waiting.length > 0} />}
        {registrations.length > 0 && (
          <Button variant="outline" asChild>
            <a href={`/api/mes-evenements/${eventId}/export`}>
              <Download /> Exporter la liste
            </a>
          </Button>
        )}
      </div>

      {active.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Personne n’est encore inscrit.</p>}

      {confirmed.length > 0 && (
        <RegistrationList title={`Inscrits (${confirmed.reduce((n, r) => n + r.seats, 0)} places)`} items={confirmed} started={started} />
      )}
      {waiting.length > 0 && <RegistrationList title={`Liste d’attente (${waiting.length})`} items={waiting} started={false} />}
      {gone.length > 0 && (
        <div>
          <button type="button" className="text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={() => setShowCancelled((v) => !v)}>
            {showCancelled ? "Masquer" : "Voir"} les inscriptions annulées ({gone.length})
          </button>
          {showCancelled && <RegistrationList title="Annulées" items={gone} started={false} className="mt-3 opacity-70" />}
        </div>
      )}
    </div>
  );
}

function RegistrationList({ title, items, started, className }: { title: string; items: RegistrationItem[]; started: boolean; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border", className)}>
      <h3 className="border-b px-4 py-2.5 text-sm font-medium">{title}</h3>
      <ul className="divide-y">
        {items.map((r) => (
          <RegistrationRowItem key={r.id} r={r} started={started} />
        ))}
      </ul>
    </section>
  );
}

function RegistrationRowItem({ r, started }: { r: RegistrationItem; started: boolean }) {
  const [pending, start] = useTransition();
  const name = `${r.firstName} ${r.lastName}`.trim();
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
      {started && r.status === "confirmed" && (
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            defaultChecked={r.attended}
            disabled={pending}
            onChange={(e) => {
              const v = e.currentTarget.checked;
              start(async () => {
                await setAttendance(r.id, v);
              });
            }}
            aria-label={`${name} était présent`}
          />
          Présent
        </label>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {r.contactId ? (
            <Link href={`/contacts/${r.contactId}`} className="hover:underline">
              {name}
            </Link>
          ) : (
            name
          )}
          {r.seats > 1 && <span className="ml-2 text-xs text-muted-foreground">{r.seats} places</span>}
          {r.source === "manual" && <span className="ml-2 text-xs text-muted-foreground">ajouté à la main</span>}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {[r.email, r.phone, r.company].filter(Boolean).join(" · ")}
        </p>
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">{formatDate(r.createdAt)}</span>
      {r.status === "waitlist" && <Badge variant="secondary">{REGISTRATION_STATUS_LABEL[r.status as RegistrationStatus]}</Badge>}
      {r.status !== "cancelled" && !started && (
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={`Annuler l’inscription de ${name}`}>
              <X />
            </Button>
          }
          title={`Annuler l’inscription de ${name} ?`}
          description="Sa place est libérée ; la première personne de la liste d’attente (s’il y en a) la reçoit et est prévenue par e-mail."
          confirmLabel="Annuler l’inscription"
          successMessage="Inscription annulée"
          onConfirm={() => coachCancelRegistration(r.id)}
        />
      )}
    </li>
  );
}

function AddRegistrationDialog({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await addManualRegistration(eventId, prev, fd);
    if (r.ok) {
      setOpen(false);
      toast.success(r.message ?? "Inscription ajoutée");
    } else if (r.error) toast.error(r.error);
    return r;
  }, {});
  const err = (f: string) => state.fieldErrors?.[f]?.[0];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus /> Ajouter une personne
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter une personne</DialogTitle>
          <DialogDescription>Quelqu’un qui s’est inscrit par téléphone ou par e-mail. La fiche contact est créée ou complétée.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Prénom *" htmlFor="reg-first" error={err("firstName")}>
              <Input id="reg-first" name="firstName" />
            </FormField>
            <FormField label="Nom" htmlFor="reg-last" error={err("lastName")}>
              <Input id="reg-last" name="lastName" />
            </FormField>
          </div>
          <FormField label="E-mail *" htmlFor="reg-email" error={err("email")}>
            <Input id="reg-email" name="email" type="email" />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-[1fr_110px]">
            <FormField label="Téléphone" htmlFor="reg-phone" error={err("phone")}>
              <Input id="reg-phone" name="phone" type="tel" />
            </FormField>
            <FormField label="Places" htmlFor="reg-seats" error={err("seats")}>
              <Input id="reg-seats" name="seats" type="number" min={1} defaultValue={1} />
            </FormField>
          </div>
          <FormField label="Structure" htmlFor="reg-company" error={err("company")}>
            <Input id="reg-company" name="company" placeholder="Entreprise, association… (facultatif)" />
          </FormField>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="sendConfirmation" defaultChecked className="size-4 accent-[var(--primary)]" />
            Lui envoyer l’e-mail de confirmation
          </label>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MessageDialog({ eventId, hasWaitlist }: { eventId: string; hasWaitlist: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await messageAttendees(eventId, prev, fd);
    if (r.ok) {
      setOpen(false);
      toast.success(r.message ?? "Message envoyé");
    } else if (r.error) toast.error(r.error);
    return r;
  }, {});
  const err = (f: string) => state.fieldErrors?.[f]?.[0];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Mail /> Écrire aux inscrits
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Écrire aux inscrits</DialogTitle>
          <DialogDescription>Un changement de salle, une précision… Chaque personne reçoit le message avec le lien de son inscription.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          {hasWaitlist ? (
            <FormField label="Destinataires" htmlFor="msg-who">
              <Select name="who" defaultValue="confirmed">
                <SelectTrigger id="msg-who" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Les inscrits</SelectItem>
                  <SelectItem value="all">Les inscrits et la liste d’attente</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          ) : (
            <input type="hidden" name="who" value="confirmed" />
          )}
          <FormField label="Objet *" htmlFor="msg-subject" error={err("subject")}>
            <Input id="msg-subject" name="subject" />
          </FormField>
          <FormField label="Message *" htmlFor="msg-body" error={err("body")}>
            <Textarea id="msg-body" name="body" rows={6} />
          </FormField>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Envoyer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
