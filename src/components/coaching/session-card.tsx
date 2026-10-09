"use client";

import { useActionState, useState, useTransition } from "react";
import {
  CalendarClock,
  CircleCheck,
  CircleSlash,
  Loader2,
  MapPin,
  MoreVertical,
  NotebookPen,
  RotateCcw,
  Trash2,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormField, toDateInput, toTimeInput } from "@/components/form-field";
import { cn } from "@/lib/utils";
import { formatDayTime } from "@/lib/format";
import { sessionStatusLabel, type SESSION_STATUSES } from "@/lib/validations/phase1";
import {
  deleteSession,
  rescheduleSession,
  saveSessionNote,
  setSessionStatus,
} from "@/server/actions/sessions";
import type { ActionState } from "@/server/actions/coaching";

type Status = (typeof SESSION_STATUSES)[number];

export type SessionCardData = {
  id: string;
  startsAt: Date;
  durationMin: number;
  type: string;
  status: Status;
  location: string | null;
  agenda: string | null;
  note: {
    content: string | null;
    templateData: Record<string, string> | null;
    nextSteps: string | null;
  } | null;
};

const statusStyle: Record<Status, string> = {
  planned: "border-info/40 text-info",
  done: "border-success/40 bg-success/10 text-success",
  cancelled: "border-border text-muted-foreground",
  no_show: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function SessionCard({
  session,
  templateFields,
  upcoming,
}: {
  session: SessionCardData;
  templateFields: string[];
  /** Upcoming sessions are shown with a dashed border. */
  upcoming?: boolean;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const note = session.note;
  // Show answers in the template's order (jsonb doesn't keep key order), extra/old fields last.
  const order = (k: string) => (templateFields.includes(k) ? templateFields.indexOf(k) : templateFields.length);
  const answers = Object.entries(note?.templateData ?? {}).sort(([a], [b]) => order(a) - order(b));

  function changeStatus(status: Status) {
    startTransition(async () => {
      const r = await setSessionStatus(session.id, status);
      if (r.error) return void toast.error(r.error);
      if (status === "done") {
        toast.success(r.counted ? "Séance effectuée · décomptée du forfait" : "Séance effectuée");
        if (!note) setNoteOpen(true); // invite to write the note right away
      } else {
        toast.success(`Séance : ${sessionStatusLabel[status].toLowerCase()}`);
      }
    });
  }

  return (
    <Card className={cn(upcoming && "border-dashed")}>
      <CardContent className="grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium first-letter:uppercase">{formatDayTime(session.startsAt)}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span>
                {session.type} · {session.durationMin} min
              </span>
              {session.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" /> {session.location}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            <Badge variant="outline" className={statusStyle[session.status]}>
              {sessionStatusLabel[session.status]}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label="Actions de la séance">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => setNoteOpen(true)}>
                  <NotebookPen /> {note ? "Modifier la note" : "Écrire la note"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {session.status !== "done" && (
                  <DropdownMenuItem onSelect={() => changeStatus("done")}>
                    <CircleCheck /> Marquer effectuée
                  </DropdownMenuItem>
                )}
                {session.status !== "no_show" && (
                  <DropdownMenuItem onSelect={() => changeStatus("no_show")}>
                    <UserX /> Client absent
                  </DropdownMenuItem>
                )}
                {session.status !== "cancelled" && (
                  <DropdownMenuItem onSelect={() => changeStatus("cancelled")}>
                    <CircleSlash /> Annuler la séance
                  </DropdownMenuItem>
                )}
                {session.status !== "planned" && (
                  <DropdownMenuItem onSelect={() => changeStatus("planned")}>
                    <RotateCcw /> Repasser en « prévue »
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => setRescheduleOpen(true)}>
                  <CalendarClock /> Reprogrammer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Supprimer la séance">
                  <Trash2 />
                </Button>
              }
              title="Supprimer cette séance ?"
              description="La séance et sa note seront définitivement supprimées. Si elle était décomptée d'un forfait, la séance est rendue au forfait."
              successMessage="Séance supprimée"
              onConfirm={() => deleteSession(session.id)}
            />
          </div>
        </div>

        {session.agenda && (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Ordre du jour : </span>
            {session.agenda}
          </p>
        )}

        {(answers.length > 0 || note?.content || note?.nextSteps) && (
          <dl className="grid gap-3 border-t border-border pt-3 text-sm sm:grid-cols-2">
            {answers.map(([k, v]) => (
              <div key={k}>
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="whitespace-pre-wrap">{v}</dd>
              </div>
            ))}
            {note?.content && (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Notes libres</dt>
                <dd className="whitespace-pre-wrap">{note.content}</dd>
              </div>
            )}
            {note?.nextSteps && (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Prochaines étapes</dt>
                <dd className="whitespace-pre-wrap">{note.nextSteps}</dd>
              </div>
            )}
          </dl>
        )}
      </CardContent>

      <NoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        session={session}
        templateFields={templateFields}
      />
      <RescheduleDialog open={rescheduleOpen} onOpenChange={setRescheduleOpen} session={session} />
    </Card>
  );
}

function NoteDialog({
  open,
  onOpenChange,
  session,
  templateFields,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  session: SessionCardData;
  templateFields: string[];
}) {
  const saved = session.note?.templateData ?? {};
  // Keep answers to fields that were later removed from the template.
  const fields = [...templateFields, ...Object.keys(saved).filter((k) => !templateFields.includes(k))];

  const [, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await saveSessionNote(prev, fd);
    if (r.ok) {
      onOpenChange(false);
      toast.success("Note enregistrée");
    } else if (r.error) toast.error(r.error);
    return r;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Note de séance</DialogTitle>
          <DialogDescription className="first-letter:uppercase">
            {formatDayTime(session.startsAt)} · privée, jamais visible par le client
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="sessionId" value={session.id} />
          {fields.map((f, i) => (
            <FormField key={f} label={f} htmlFor={`f-${i}`}>
              <Textarea id={`f-${i}`} name={`f:${f}`} rows={2} defaultValue={saved[f] ?? ""} />
            </FormField>
          ))}
          <FormField label="Notes libres" htmlFor="content">
            <Textarea id="content" name="content" rows={3} defaultValue={session.note?.content ?? ""} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Enregistrer la note
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RescheduleDialog({
  open,
  onOpenChange,
  session,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  session: SessionCardData;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await rescheduleSession(prev, fd);
    if (r.ok) {
      onOpenChange(false);
      toast.success("Séance reprogrammée");
    } else if (r.error) toast.error(r.error);
    return r;
  }, {});
  const err = (f: string) => state.fieldErrors?.[f]?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reprogrammer la séance</DialogTitle>
          <DialogDescription>La séance repasse en « prévue » à la nouvelle date.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="sessionId" value={session.id} />
          <input type="hidden" name="tzOffset" value={new Date().getTimezoneOffset()} />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" htmlFor="date" error={err("date")}>
              <Input id="date" name="date" type="date" defaultValue={toDateInput(session.startsAt)} required />
            </FormField>
            <FormField label="Heure" htmlFor="time" error={err("time")}>
              <Input id="time" name="time" type="time" step={300} defaultValue={toTimeInput(session.startsAt)} required />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Reprogrammer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
