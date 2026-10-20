"use client";

import { useTransition } from "react";
import { Copy, Link2, Loader2, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { createClientBookingLink, regenerateClientBookingLink, sendClientBookingLink } from "@/server/actions/client-booking";

/** Fiche client: the client's personal link to book coaching sessions online (no login needed). */
export function ClientBookingLink({
  contactId,
  firstName,
  link,
  hasEmail,
}: {
  contactId: string;
  firstName: string;
  link: { url: string; lastUsedLabel: string | null } | null;
  hasEmail: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<{ ok?: boolean; error?: string; message?: string }>, success: string) =>
    startTransition(async () => {
      const r = await action();
      if (r.error) toast.error(r.error);
      else toast.success(r.message ?? success);
    });

  if (!link) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">
          Un lien personnel pour que {firstName} réserve ses séances en ligne, selon vos disponibilités.
        </p>
        <Button
          variant="outline"
          className="justify-self-start"
          disabled={pending}
          onClick={() => run(() => createClientBookingLink(contactId), "Lien créé")}
        >
          {pending ? <Loader2 className="animate-spin" /> : <Link2 />}
          Créer le lien
        </Button>
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success("Lien copié");
    } catch {
      toast.error("Copie impossible : sélectionnez le lien et copiez-le à la main.");
    }
  };

  return (
    <div className="grid gap-3">
      <Input readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} aria-label="Lien de réservation" className="font-mono text-xs" />
      <p className="text-xs text-muted-foreground">
        {link.lastUsedLabel ? `Dernière réservation : ${link.lastUsedLabel}` : "Pas encore utilisé"}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={copy}>
          <Copy /> Copier
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending || !hasEmail}
          title={hasEmail ? undefined : "Ajoutez d’abord une adresse e-mail"}
          onClick={() => run(() => sendClientBookingLink(contactId), "Lien envoyé")}
        >
          {pending ? <Loader2 className="animate-spin" /> : <Mail />} Envoyer par e-mail
        </Button>
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="sm">
              <RefreshCw /> Régénérer
            </Button>
          }
          title="Régénérer le lien ?"
          description={`L’ancien lien de ${firstName} cessera de fonctionner. Pensez à lui envoyer le nouveau.`}
          confirmLabel="Régénérer"
          successMessage="Nouveau lien créé"
          onConfirm={() => regenerateClientBookingLink(contactId)}
        />
      </div>
    </div>
  );
}
