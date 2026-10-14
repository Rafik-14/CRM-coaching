"use client";

import { useActionState, useState } from "react";
import { Loader2, PenLine } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form-field";
import { saveCaseStudy, type ActionState } from "@/server/actions/coaching";

export type CaseStudyValues = {
  positioningStatement: string | null;
  caseStudy: { before?: string; trigger?: string; after?: string; changes?: string[] } | null;
  testimonialConsent: boolean;
};

/**
 * « Transformations » format from Jérémy's site: Avant → Le déclic → Après → Ce qui a changé,
 * plus the positioning statement (the case's « pièce à conviction »).
 */
export function CaseStudyFields({
  values,
  errors,
}: {
  values?: CaseStudyValues;
  errors?: Record<string, string[] | undefined>;
}) {
  const err = (f: string) => errors?.[f]?.[0];
  const cs = values?.caseStudy;
  return (
    <div className="grid gap-4">
      <FormField
        label="Formulation de positionnement"
        htmlFor="cs-positioning"
        error={err("positioningStatement")}
        hint="La phrase qui résume la valeur du client, telle qu'elle a émergé."
      >
        <Textarea
          id="cs-positioning"
          name="positioningStatement"
          rows={2}
          defaultValue={values?.positioningStatement ?? ""}
          placeholder="ex. Révéler le potentiel caché des organisations grâce à…"
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Avant" htmlFor="cs-before" error={err("before")}>
          <Textarea id="cs-before" name="before" rows={3} defaultValue={cs?.before ?? ""} placeholder="« Je sais ce que je fais, mais… »" />
        </FormField>
        <FormField label="Le déclic" htmlFor="cs-trigger" error={err("trigger")}>
          <Textarea id="cs-trigger" name="trigger" rows={3} defaultValue={cs?.trigger ?? ""} />
        </FormField>
        <FormField label="Après" htmlFor="cs-after" error={err("after")}>
          <Textarea id="cs-after" name="after" rows={3} defaultValue={cs?.after ?? ""} />
        </FormField>
      </div>
      <FormField label="Ce qui a changé (une ligne par changement)" htmlFor="cs-changes" error={err("changes")}>
        <Textarea
          id="cs-changes"
          name="changes"
          rows={3}
          defaultValue={cs?.changes?.join("\n") ?? ""}
          placeholder={"De « ce que je fais » → à « ce que je provoque »"}
        />
      </FormField>
      <label className="flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          name="testimonialConsent"
          defaultChecked={values?.testimonialConsent}
          className="mt-0.5 size-4 accent-[var(--primary)]"
        />
        <span>
          Le client accepte que ce parcours serve d&apos;étude de cas
          <span className="block text-xs text-muted-foreground">Prénom et domaine seulement, comme sur le site.</span>
        </span>
      </label>
    </div>
  );
}

export function CaseStudyDialog({ contactId, values }: { contactId: string; values: CaseStudyValues }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await saveCaseStudy(prev, fd);
    if (r.ok) {
      setOpen(false);
      toast.success("Étude de cas enregistrée");
    } else if (r.error) toast.error(r.error);
    return r;
  }, {});
  const empty = !values.positioningStatement && !values.caseStudy;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={empty ? "outline" : "ghost"} size="sm">
          <PenLine /> {empty ? "Rédiger" : "Modifier"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Transformation</DialogTitle>
          <DialogDescription>Le parcours du client, au format des études de cas de votre site.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-5" key={open ? "open" : "closed"}>
          <input type="hidden" name="contactId" value={contactId} />
          <CaseStudyFields values={values} errors={state.fieldErrors} />
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
