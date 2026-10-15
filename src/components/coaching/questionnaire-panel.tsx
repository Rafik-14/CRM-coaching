"use client";

import { useTransition } from "react";
import { Copy, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getQuestionnaireLink, sendQuestionnaire } from "@/server/actions/questionnaire";

/** Fiche client › Questionnaire: where it stands, the answers, and how to (re)send the link. */
export function QuestionnairePanel({
  contactId,
  hasEmail,
  status,
  answers,
}: {
  contactId: string;
  hasEmail: boolean;
  /** « Rempli le … », « Lien envoyé le … » or null when never sent. */
  status: string | null;
  answers: { label: string; value: string }[] | null;
}) {
  const [pending, startTransition] = useTransition();
  const send = () =>
    startTransition(async () => {
      const r = await sendQuestionnaire(contactId);
      if (r.error) toast.error(r.error);
      else toast.success(r.message ?? "Questionnaire envoyé");
    });
  const copy = () =>
    startTransition(async () => {
      try {
        await navigator.clipboard.writeText(await getQuestionnaireLink(contactId));
        toast.success("Lien copié (valable 30 jours)");
      } catch {
        toast.error("Copie impossible.");
      }
    });

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{status ?? "Pas encore envoyé."}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={send} disabled={pending || !hasEmail} title={hasEmail ? undefined : "Ajoutez d’abord une adresse e-mail"}>
            {pending ? <Loader2 className="animate-spin" /> : <Send />} {status ? "Renvoyer le lien" : "Envoyer le questionnaire"}
          </Button>
          <Button variant="ghost" size="sm" onClick={copy} disabled={pending}>
            <Copy /> Copier le lien
          </Button>
        </div>
      </div>
      {answers ? (
        <dl className="grid gap-4">
          {answers.map((a) => (
            <div key={a.label} className="rounded-xl border border-border p-4">
              <dt className="text-xs font-medium text-muted-foreground">{a.label}</dt>
              <dd className="mt-1 text-sm whitespace-pre-line">{a.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Les réponses apparaîtront ici dès que le questionnaire sera rempli.
        </p>
      )}
    </div>
  );
}
