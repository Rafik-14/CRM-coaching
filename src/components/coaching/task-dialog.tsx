"use client";

import { useActionState, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormField, toDateInput } from "@/components/form-field";
import { createTask, deleteTask, updateTask } from "@/server/actions/client-data";
import type { ActionState } from "@/server/actions/coaching";

type Task = { id: string; title: string; dueAt: Date | null; contactId: string | null };
type ContactOption = { id: string; name: string };

/**
 * Create or edit a task. Pass `contacts` to let the coach pick who it's about,
 * or `fixedContactId` when opened from a contact's file.
 */
export function TaskDialog({
  task,
  contacts,
  fixedContactId,
}: {
  task?: Task;
  contacts?: ContactOption[];
  fixedContactId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = task ? await updateTask(task.id, prev, fd) : await createTask(prev, fd);
    if (r.ok) {
      setOpen(false);
      toast.success(task ? "Tâche mise à jour" : "Tâche ajoutée");
    } else if (r.error) toast.error(r.error);
    return r;
  }, {});
  const err = (f: string) => state.fieldErrors?.[f]?.[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {task ? (
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Modifier la tâche">
            <Pencil />
          </Button>
        ) : (
          <Button>
            <Plus /> Nouvelle tâche
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? "Modifier la tâche" : "Nouvelle tâche"}</DialogTitle>
          <DialogDescription>Un rappel pour ne rien oublier.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <FormField label="Tâche *" htmlFor="task-title" error={err("title")}>
            <Input id="task-title" name="title" defaultValue={task?.title} placeholder="ex. Envoyer le bilan à Marie" />
          </FormField>
          <FormField label="Échéance" htmlFor="task-due" error={err("dueAt")}>
            <Input id="task-due" name="dueAt" type="date" defaultValue={toDateInput(task?.dueAt)} />
          </FormField>
          {fixedContactId ? (
            <input type="hidden" name="contactId" value={fixedContactId} />
          ) : (
            contacts && (
              <FormField label="Contact concerné" htmlFor="task-contact">
                <Select name="contactId" defaultValue={task?.contactId ?? "none"}>
                  <SelectTrigger id="task-contact" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="none">Aucun</SelectItem>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )
          )}
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

export function DeleteTaskButton({ id, title }: { id: string; title: string }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Supprimer la tâche">
          <Trash2 />
        </Button>
      }
      title="Supprimer cette tâche ?"
      description={`« ${title} » sera définitivement supprimée.`}
      successMessage="Tâche supprimée"
      onConfirm={() => deleteTask(id)}
    />
  );
}
