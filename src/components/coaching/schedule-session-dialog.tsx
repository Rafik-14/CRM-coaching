"use client";

import { useActionState, useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, CircleCheck, Loader2, MapPin, Phone, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { scheduleSession, type ActionState } from "@/server/actions/coaching";
import { SESSION_DURATIONS, SESSION_LOCATIONS, SESSION_TYPES } from "@/lib/validations/coaching";

const WEEKDAYS = ["LU", "MA", "ME", "JE", "VE", "SA", "DI"];
const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const SLOTS = Array.from({ length: 23 }, (_, i) => {
  const minutes = 8 * 60 + i * 30; // 08:00 → 19:00
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
const locationIcon = { Visio: Video, Cabinet: MapPin, Téléphone: Phone } as const;

const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function ScheduleSessionDialog({
  contactId,
  contactName,
  disabledReason,
  triggerClassName,
  prospect,
}: {
  contactId: string;
  contactName: string;
  /** When set, the trigger is disabled and shows this hint. */
  disabledReason?: string;
  triggerClassName?: string;
  /** Prospects (not yet clients) can only book a discovery call. */
  prospect?: boolean;
}) {
  const types = prospect ? (["Appel découverte"] as const) : SESSION_TYPES;
  const label = prospect ? "Planifier un appel découverte" : "Planifier une séance";
  const [open, setOpen] = useState(false);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [location, setLocation] = useState<(typeof SESSION_LOCATIONS)[number]>("Visio");

  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const result = await scheduleSession(prev, fd);
    if (result.ok) {
      setOpen(false);
      setDate(null);
      setTime(null);
      toast.success(`${prospect ? "Appel découverte planifié" : "Séance planifiée"} avec ${contactName}`);
    } else if (result.error) {
      toast.error(result.error);
    }
    return result;
  }, {});

  // Monday-first month grid
  const days = useMemo(() => {
    const first = new Date(month);
    const offset = (first.getDay() + 6) % 7;
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array<null>(offset).fill(null), ...Array.from({ length: count }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  }, [month]);

  const now = new Date();
  const isToday = date && toKey(date) === toKey(now);
  const slotPast = (slot: string) => {
    if (!isToday) return false;
    const [h, m] = slot.split(":").map(Number);
    return h * 60 + m <= now.getHours() * 60 + now.getMinutes();
  };
  const err = (f: string) => state.fieldErrors?.[f]?.[0];
  const canGoBack = month > new Date(today.getFullYear(), today.getMonth(), 1);

  if (disabledReason) {
    return (
      <Button className={triggerClassName} disabled title={disabledReason}>
        <CalendarPlus /> {label}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={triggerClassName}>
          <CalendarPlus /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <form action={formAction} className="grid md:grid-cols-[1fr_1.15fr]">
          <input type="hidden" name="contactId" value={contactId} />
          <input type="hidden" name="date" value={date ? toKey(date) : ""} />
          <input type="hidden" name="time" value={time ?? ""} />
          <input type="hidden" name="location" value={location} />
          <input type="hidden" name="tzOffset" value={new Date().getTimezoneOffset()} />

          {/* Left: calendar + slots */}
          <div className="border-b border-border bg-muted/40 p-5 md:border-r md:border-b-0">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold first-letter:uppercase">{monthFmt.format(month)}</span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={!canGoBack}
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                  aria-label="Mois précédent"
                >
                  <ChevronLeft />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                  aria-label="Mois suivant"
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
              {WEEKDAYS.map((d) => (
                <span key={d} className="py-1">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((d, i) =>
                d ? (
                  <button
                    key={i}
                    type="button"
                    disabled={d < today}
                    onClick={() => {
                      setDate(d);
                      setTime(null);
                    }}
                    aria-pressed={!!date && toKey(d) === toKey(date)}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-lg text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-30",
                      toKey(d) === toKey(today) && "font-semibold text-primary",
                      date && toKey(d) === toKey(date) && "bg-primary text-primary-foreground hover:bg-primary",
                    )}
                  >
                    {d.getDate()}
                  </button>
                ) : (
                  <span key={i} />
                ),
              )}
            </div>

            <p className="mt-5 mb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {date ? `Créneaux · ${dayFmt.format(date)}` : "Choisissez un jour"}
            </p>
            <div className="grid max-h-40 grid-cols-3 gap-2 overflow-y-auto pr-1">
              {date &&
                SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    disabled={slotPast(slot)}
                    onClick={() => setTime(slot)}
                    aria-pressed={time === slot}
                    className={cn(
                      "rounded-lg border border-border bg-background py-2 text-sm tabular-nums transition-colors hover:border-primary/60 disabled:pointer-events-none disabled:opacity-30",
                      time === slot && "border-primary bg-primary/15 text-primary",
                    )}
                  >
                    {slot}
                  </button>
                ))}
            </div>
            {(err("date") || err("time")) && (
              <p className="mt-2 text-xs text-destructive">{err("date") ?? err("time")}</p>
            )}
          </div>

          {/* Right: details */}
          <div className="grid content-start gap-5 p-5">
            <div>
              <DialogTitle className="text-xl">Détails de la séance</DialogTitle>
              <DialogDescription>Avec {contactName}</DialogDescription>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="durationMin">Durée</Label>
                <Select name="durationMin" defaultValue="60">
                  <SelectTrigger id="durationMin" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_DURATIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} minutes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select name="type" defaultValue={types[0]}>
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Lieu</Label>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Lieu">
                {SESSION_LOCATIONS.map((l) => {
                  const Icon = locationIcon[l];
                  return (
                    <button
                      key={l}
                      type="button"
                      role="radio"
                      aria-checked={location === l}
                      onClick={() => setLocation(l)}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm transition-colors hover:border-primary/60",
                        location === l && "border-primary bg-primary/15 text-primary",
                      )}
                    >
                      <Icon className="size-4" /> {l}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="agenda">Ordre du jour & notes</Label>
              <Textarea id="agenda" name="agenda" rows={3} placeholder="Thèmes à aborder, préparation…" />
            </div>

            <div className="mt-1 grid grid-cols-[auto_1fr] gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={pending || !date || !time}
               
              >
                {pending ? <Loader2 className="animate-spin" /> : <CircleCheck />}
                Confirmer la séance
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
