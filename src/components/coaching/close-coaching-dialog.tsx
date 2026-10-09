"use client";

import { useActionState, useState } from "react";
import {
  CirclePause,
  CircleStop,
  Flag,
  Loader2,
  TriangleAlert,
  Trophy,
} from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { closeCoaching, type ActionState } from "@/server/actions/coaching";
import { Illustration3D } from "@/components/illustrations/illustration-3d";
import { CLOSE_OUTCOMES, CLOSE_REASONS } from "@/lib/validations/coaching";

type Outcome = keyof typeof CLOSE_OUTCOMES;
const icons = {
  finished: Trophy,
  paused: CirclePause,
  stopped: CircleStop,
} as const;
const tone = {
  finished: "border-success/60 bg-success/10 text-success",
  paused: "border-warning/60 bg-warning/10 text-warning",
  stopped: "border-destructive/60 bg-destructive/10 text-destructive",
} as const;

/**
 * Close a coaching (finished / paused / stopped). Stays mounted while the coaching is closed
 * (`active = false` only hides the trigger) so the success celebration survives the page refresh.
 */
export function CloseCoachingDialog({
  contactId,
  contactName,
  active = true,
}: {
  contactId: string;
  contactName: string;
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [reason, setReason] = useState("");
  const [celebrate, setCelebrate] = useState(false);

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const result = await closeCoaching(prev, fd);
      if (result.ok && fd.get("outcome") === "finished") {
        setCelebrate(true);
      } else if (result.ok) {
        setOpen(false);
        toast.success("Accompagnement mis à jour");
      } else if (result.error) {
        toast.error(result.error);
      }
      return result;
    },
    {},
  );
  const err = (f: string) => state.fieldErrors?.[f]?.[0];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setOutcome(null);
          setReason("");
          setCelebrate(false);
        }
      }}
    >
      {active && (
        <DialogTrigger asChild>
          <Button variant="outline">
            <Flag /> Clôturer
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-xl">
        {celebrate ? (
          <div className="grid justify-items-center gap-4 py-2 text-center">
            <Illustration3D name="jump" alt="" height={200} />
            <DialogHeader className="items-center">
              <DialogTitle className="text-2xl">Félicitations !</DialogTitle>
              <DialogDescription className="max-w-sm">
                L&apos;accompagnement de {contactName} est terminé avec succès.
                Un beau chemin parcouru ensemble.
              </DialogDescription>
            </DialogHeader>
            <Button onClick={() => setOpen(false)}>Fermer</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Clôturer l&apos;accompagnement</DialogTitle>
              <DialogDescription>
                Mettre à jour le suivi de {contactName}.
              </DialogDescription>
            </DialogHeader>
            <form action={formAction} className="grid gap-5">
              <input type="hidden" name="contactId" value={contactId} />
              <input type="hidden" name="outcome" value={outcome ?? ""} />

              <div
                className="grid gap-2 sm:grid-cols-3"
                role="radiogroup"
                aria-label="Résultat"
              >
                {(Object.keys(CLOSE_OUTCOMES) as Outcome[]).map((o) => {
                  const Icon = icons[o];
                  return (
                    <button
                      key={o}
                      type="button"
                      role="radio"
                      aria-checked={outcome === o}
                      onClick={() => {
                        setOutcome(o);
                        setReason("");
                      }}
                      className={cn(
                        "grid justify-items-center gap-1.5 rounded-xl border border-border bg-muted/40 p-4 text-center transition-colors hover:border-primary/50",
                        outcome === o && tone[o],
                      )}
                    >
                      <Icon className="size-5" />
                      <span className="text-xs font-semibold tracking-wide uppercase">
                        {CLOSE_OUTCOMES[o].label}
                      </span>
                      <span className="text-[11px] leading-snug text-muted-foreground">
                        {CLOSE_OUTCOMES[o].description}
                      </span>
                    </button>
                  );
                })}
              </div>
              {err("outcome") && (
                <p className="-mt-3 text-xs text-destructive">
                  {err("outcome")}
                </p>
              )}

              <div className="grid gap-2">
                <Label htmlFor="reason">Raison</Label>
                <Select
                  name="reason"
                  value={reason}
                  onValueChange={setReason}
                  disabled={!outcome}
                >
                  <SelectTrigger id="reason" className="w-full">
                    <SelectValue
                      placeholder={
                        outcome
                          ? "Choisissez une raison…"
                          : "Choisissez d'abord un résultat"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {outcome &&
                      CLOSE_REASONS[outcome].map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {err("reason") && (
                  <p className="text-xs text-destructive">{err("reason")}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="note">Note interne (facultatif)</Label>
                <Textarea
                  id="note"
                  name="note"
                  rows={3}
                  placeholder="Bilan, contexte, suite éventuelle…"
                />
              </div>

              {outcome && outcome !== "paused" && (
                <div className="flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                  <p>
                    Les séances à venir seront <strong>annulées</strong> et le
                    contact passera à la dernière étape du pipeline. Vous
                    pourrez reprendre l&apos;accompagnement plus tard si besoin.
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={pending || !outcome || !reason}>
                  {pending && <Loader2 className="animate-spin" />}
                  Confirmer
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
