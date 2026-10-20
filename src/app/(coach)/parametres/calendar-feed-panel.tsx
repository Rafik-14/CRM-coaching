"use client";

import { useTransition } from "react";
import { CalendarPlus, Copy, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { disableCalendarFeed, enableCalendarFeed, regenerateCalendarFeed } from "@/server/actions/calendar-feed";

export type CalendarFeedView = { url: string; webcalUrl: string; createdLabel: string; lastUsedLabel: string | null } | null;

/** Paramètres › Agenda: private link to subscribe to the sessions from Google / iPhone / Outlook. */
export function CalendarFeedPanel({ feed }: { feed: CalendarFeedView }) {
  const [pending, startTransition] = useTransition();

  if (!feed) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">Le lien d’agenda est désactivé.</p>
        <Button
          className="justify-self-start"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await enableCalendarFeed();
              toast.success("Lien d’agenda créé");
            })
          }
        >
          {pending ? <Loader2 className="animate-spin" /> : <CalendarPlus />}
          Créer mon lien d’agenda
        </Button>
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(feed.url);
      toast.success("Lien copié");
    } catch {
      toast.error("Copie impossible : sélectionnez le lien et copiez-le à la main.");
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input readOnly value={feed.url} onFocus={(e) => e.currentTarget.select()} aria-label="Lien de l’agenda" className="font-mono text-xs" />
        <Button type="button" variant="outline" onClick={copy} className="shrink-0">
          <Copy /> Copier le lien
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Créé le {feed.createdLabel} ·{" "}
        {feed.lastUsedLabel ? `dernière lecture par un agenda : ${feed.lastUsedLabel}` : "pas encore lu par un agenda"}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <a href={feed.webcalUrl}>
            <CalendarPlus /> Ouvrir dans l’agenda de cet appareil
          </a>
        </Button>
        <ConfirmDialog
          trigger={
            <Button variant="outline">
              <RefreshCw /> Régénérer
            </Button>
          }
          title="Régénérer le lien ?"
          description="L’ancien lien cessera de fonctionner : les agendas abonnés avec lui ne se mettront plus à jour. Il faudra ajouter le nouveau lien."
          confirmLabel="Régénérer"
          successMessage="Nouveau lien créé"
          onConfirm={async () => {
            await regenerateCalendarFeed();
          }}
        />
        <ConfirmDialog
          trigger={<Button variant="ghost">Désactiver</Button>}
          title="Désactiver le lien d’agenda ?"
          description="Le lien cessera de fonctionner et vos séances n’apparaîtront plus dans les agendas abonnés."
          confirmLabel="Désactiver"
          successMessage="Lien désactivé"
          onConfirm={async () => {
            await disableCalendarFeed();
          }}
        />
      </div>
    </div>
  );
}
