"use client";

import { useTransition } from "react";
import { Ban, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cancelEvent, deleteEvent, setEventPublished } from "@/server/actions/events";

/** Publish / unpublish, cancel and delete buttons of an event page. */
export function EventActions({ id, status, hasRegistrations, past }: { id: string; status: string; hasRegistrations: boolean; past: boolean }) {
  const [pending, start] = useTransition();
  const toggle = (published: boolean) =>
    start(async () => {
      const r = await setEventPublished(id, published);
      if (r.error) toast.error(r.error);
      else toast.success(r.message ?? "Enregistré");
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "draft" && (
        <Button onClick={() => toggle(true)} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Eye />} Publier sur le site
        </Button>
      )}
      {status === "published" && (
        <Button variant="outline" onClick={() => toggle(false)} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <EyeOff />} Repasser en brouillon
        </Button>
      )}
      {status !== "cancelled" && !past && (
        <ConfirmDialog
          trigger={
            <Button variant="outline">
              <Ban /> Annuler l’événement
            </Button>
          }
          title="Annuler cet événement ?"
          description={
            hasRegistrations
              ? "Toutes les personnes inscrites ou sur liste d’attente recevront un e-mail d’annulation. Les inscriptions seront fermées."
              : "Les inscriptions seront fermées et l’événement affiché comme annulé."
          }
          confirmLabel="Annuler l’événement"
          successMessage={hasRegistrations ? "Événement annulé : les personnes inscrites sont prévenues par e-mail." : "Événement annulé."}
          onConfirm={() => cancelEvent(id)}
        />
      )}
      {!hasRegistrations && (
        <ConfirmDialog
          trigger={
            <Button variant="ghost" className="text-muted-foreground" aria-label="Supprimer l’événement">
              <Trash2 />
            </Button>
          }
          title="Supprimer cet événement ?"
          description="Il disparaît du CRM et du site, avec ses photos. Cette action est définitive."
          confirmLabel="Supprimer"
          onConfirm={() => deleteEvent(id)}
        />
      )}
    </div>
  );
}
