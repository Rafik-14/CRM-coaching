"use client";

import { useActionState, useState } from "react";
import { Loader2, Pencil, Plus, Target, Trash2 } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormField, toDateInput } from "@/components/form-field";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { GOAL_STATUSES, goalStatusLabel } from "@/lib/validations/phase1";
import { createGoal, deleteGoal, updateGoal } from "@/server/actions/client-data";
import type { ActionState } from "@/server/actions/coaching";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  progress: number;
  dueDate: Date | null;
  status: (typeof GOAL_STATUSES)[number];
};

const statusTone = {
  active: "border-info/40 text-info",
  achieved: "border-success/40 bg-success/10 text-success",
  abandoned: "border-border text-muted-foreground",
} as const;

export function GoalsPanel({ contactId, goals }: { contactId: string; goals: Goal[] }) {
  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <GoalDialog contactId={contactId} />
      </div>
      {goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <Target className="size-8 text-muted-foreground" />
            <p className="font-medium">Aucun objectif pour le moment</p>
            <p className="text-sm text-muted-foreground">Définissez avec votre client ce qu&apos;il veut atteindre.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => (
            <Card key={g.id}>
              <CardContent className="grid gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{g.title}</p>
                    {g.description && <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>}
                  </div>
                  <div className="flex shrink-0 items-center">
                    <GoalDialog contactId={contactId} goal={g} />
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Supprimer l'objectif">
                          <Trash2 />
                        </Button>
                      }
                      title="Supprimer cet objectif ?"
                      description={`« ${g.title} » sera définitivement supprimé.`}
                      successMessage="Objectif supprimé"
                      onConfirm={() => deleteGoal(g.id)}
                    />
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", g.status === "achieved" ? "bg-success" : "bg-primary")}
                    style={{ width: `${g.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className={statusTone[g.status]}>
                      {goalStatusLabel[g.status]}
                    </Badge>
                    {g.progress} %
                  </span>
                  <span>Échéance : {formatDate(g.dueDate)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function GoalDialog({ contactId, goal }: { contactId: string; goal?: Goal }) {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(goal?.progress ?? 0);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = goal ? await updateGoal(goal.id, prev, fd) : await createGoal(contactId, prev, fd);
    if (r.ok) {
      setOpen(false);
      toast.success(goal ? "Objectif mis à jour" : "Objectif ajouté");
    } else if (r.error) toast.error(r.error);
    return r;
  }, {});
  const err = (f: string) => state.fieldErrors?.[f]?.[0];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setProgress(goal?.progress ?? 0);
      }}
    >
      <DialogTrigger asChild>
        {goal ? (
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Modifier l'objectif">
            <Pencil />
          </Button>
        ) : (
          <Button>
            <Plus /> Nouvel objectif
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{goal ? "Modifier l'objectif" : "Nouvel objectif"}</DialogTitle>
          <DialogDescription>Un objectif clair, mesurable, avec une échéance.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <FormField label="Objectif *" htmlFor="title" error={err("title")}>
            <Input id="title" name="title" defaultValue={goal?.title} placeholder="ex. Prendre la parole en réunion" />
          </FormField>
          <FormField label="Description" htmlFor="description">
            <Textarea id="description" name="description" rows={2} defaultValue={goal?.description ?? ""} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Échéance" htmlFor="dueDate" error={err("dueDate")}>
              <Input id="dueDate" name="dueDate" type="date" defaultValue={toDateInput(goal?.dueDate)} />
            </FormField>
            <FormField label="Statut" htmlFor="status">
              <Select name="status" defaultValue={goal?.status ?? "active"}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {goalStatusLabel[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label={`Progression : ${progress} %`} htmlFor="progress">
            <input
              id="progress"
              name="progress"
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-primary"
            />
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
