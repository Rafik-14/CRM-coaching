"use client";

import { useActionState, useState } from "react";
import { CalendarOff, CalendarPlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormField } from "@/components/form-field";
import { cn } from "@/lib/utils";
import { addAvailabilityException, deleteAvailabilityException } from "@/server/actions/booking";
import type { ActionState } from "@/server/actions/coaching";

export type ExceptionRow = {
  id: string;
  kind: string;
  startsOn: string;
  endsOn: string;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
};

/** « 2026-10-20 » is a calendar day: noon UTC avoids any shift. */
const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
const day = (date: string) => dayFmt.format(new Date(`${date}T12:00:00Z`));

function describe(e: ExceptionRow) {
  const dates = e.startsOn === e.endsOn ? day(e.startsOn) : `du ${day(e.startsOn)} au ${day(e.endsOn)}`;
  const hours = e.startTime && e.endTime ? `${e.startTime.replace(":", "h")} – ${e.endTime.replace(":", "h")}` : "toute la journée";
  return { dates: dates.charAt(0).toUpperCase() + dates.slice(1), hours };
}

/**
 * Paramètres › Réservation en ligne: Jérémy's availability changes with his situation, so days off and extra hours
 * are added and removed whenever needed (no fixed holiday calendar). The site updates at once.
 */
export function AvailabilityExceptions({ exceptions, today }: { exceptions: ExceptionRow[]; today: string }) {
  const [kind, setKind] = useState<"blocked" | "extra">("blocked");
  const [allDay, setAllDay] = useState(true);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await addAvailabilityException(prev, fd);
    if (r.ok) {
      toast.success(r.message ?? "Enregistré", { duration: r.message?.includes("Attention") ? 10_000 : 4_000 });
      setFormKey((k) => k + 1);
    } else if (r.error) toast.error(r.error);
    return r;
  }, {});
  const e = state.fieldErrors;
  const wholeDay = kind === "blocked" && allDay;

  return (
    <div className="grid gap-6">
      <form key={formKey} action={formAction} className="grid gap-4 rounded-xl border border-border p-4">
        <input type="hidden" name="kind" value={kind} />
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type">
          {(
            [
              { value: "blocked", label: "Je ne suis pas disponible", icon: CalendarOff },
              { value: "extra", label: "J’ouvre des horaires en plus", icon: CalendarPlus },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={kind === value}
              onClick={() => setKind(value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                kind === value ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Du" htmlFor="startsOn" error={e?.startsOn?.[0]}>
            <Input id="startsOn" name="startsOn" type="date" min={today} required />
          </FormField>
          <FormField label="Au (inclus)" htmlFor="endsOn" hint="Vide = un seul jour." error={e?.endsOn?.[0]}>
            <Input id="endsOn" name="endsOn" type="date" min={today} />
          </FormField>
        </div>

        {kind === "blocked" && (
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="allDay"
              checked={allDay}
              onChange={(ev) => setAllDay(ev.target.checked)}
              className="size-4 accent-primary"
            />
            Toute la journée
          </label>
        )}
        {!wholeDay && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="De" htmlFor="startTime" error={e?.startTime?.[0]}>
              <Input id="startTime" name="startTime" type="time" step={900} required />
            </FormField>
            <FormField label="À" htmlFor="endTime" error={e?.endTime?.[0]}>
              <Input id="endTime" name="endTime" type="time" step={900} required />
            </FormField>
          </div>
        )}

        <FormField label="Note (pour vous seulement)" htmlFor="note" error={e?.note?.[0]}>
          <Input id="note" name="note" maxLength={120} placeholder={kind === "blocked" ? "Vacances, formation, rendez-vous perso…" : "Samedi exceptionnel…"} />
        </FormField>

        <Button type="submit" disabled={pending} className="justify-self-start">
          {pending && <Loader2 className="animate-spin" />}
          {kind === "blocked" ? "Bloquer cette période" : "Ouvrir ces horaires"}
        </Button>
      </form>

      <div>
        <h3 className="text-sm font-medium">À venir</h3>
        {exceptions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Aucune absence ni horaire exceptionnel : seules vos plages habituelles s’appliquent.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border text-sm">
            {exceptions.map((x) => {
              const { dates, hours } = describe(x);
              return (
                <li key={x.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
                      x.kind === "extra" ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
                    )}
                  >
                    {x.kind === "extra" ? "En plus" : "Absent"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{dates}</span> · {hours}
                    {x.note && <span className="text-muted-foreground"> · {x.note}</span>}
                  </span>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon" aria-label="Supprimer">
                        <Trash2 />
                      </Button>
                    }
                    title="Supprimer ?"
                    description={
                      x.kind === "extra"
                        ? "Ces horaires ne seront plus proposés sur le site."
                        : "Les créneaux habituels de cette période seront de nouveau proposés sur le site."
                    }
                    successMessage="Supprimé"
                    onConfirm={() => deleteAvailabilityException(x.id)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
