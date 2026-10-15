"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CircleCheck, X } from "lucide-react";
import type { AvailableDay } from "@/lib/booking";
import { cn } from "@/lib/utils";
import { cancelBooking, moveBooking, type ManageState } from "@/server/actions/manage-booking";
import { siteButton } from "./button";
import { inputClass } from "./form";
import { SlotPicker, describeSlot } from "./slot-picker";

/** /rdv/<token>: move to another free slot, or cancel. Both go through the server checks again. */
export function ManageBooking({
  token,
  days,
  durationMin,
  location,
}: {
  token: string;
  days: AvailableDay[];
  durationMin: number;
  location: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "move" | "cancel">("idle");
  const [slot, setSlot] = useState("");
  const [moveState, move, moving] = useActionState<ManageState, FormData>(async (prev, fd) => {
    const r = await moveBooking(token, prev, fd);
    if (r.error) router.refresh(); // fresh slots
    return r;
  }, {});
  const [cancelState, cancel, cancelling] = useActionState<ManageState, FormData>(
    (prev, fd) => cancelBooking(token, prev, fd),
    {},
  );

  if (moveState.done || cancelState.done) {
    return (
      <div className="rounded-[12px] border border-[var(--jg-light-gray)] bg-white p-7 md:p-9" role="status">
        <CircleCheck aria-hidden className="size-8 text-[var(--jg-teal)]" strokeWidth={1.5} />
        <p className="jg-h4 mt-4 font-heading font-semibold text-navy">
          {moveState.done ? "C’est noté, votre rendez-vous est déplacé." : "C’est noté, votre rendez-vous est annulé."}
        </p>
        <p className="mt-3">Vous recevez une confirmation par e-mail.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {mode === "idle" && (
        <div className="flex flex-col gap-4 sm:flex-row">
          <button type="button" onClick={() => setMode("move")} className={siteButton()} disabled={!days.length}>
            <CalendarClock aria-hidden /> Choisir un autre horaire
          </button>
          <button type="button" onClick={() => setMode("cancel")} className={siteButton({ variant: "secondary" })}>
            <X aria-hidden /> Annuler le rendez-vous
          </button>
        </div>
      )}
      {mode === "idle" && !days.length && (
        <p className="jg-small">Aucun autre créneau n’est libre pour le moment : répondez à l’e-mail reçu pour trouver un horaire ensemble.</p>
      )}

      {mode === "move" && (
        <form action={move} className="grid gap-8 rounded-[12px] border border-[var(--jg-light-gray)] bg-ivory p-6 md:p-9">
          <input type="hidden" name="slot" value={slot} />
          <SlotPicker
            days={days}
            slot={slot}
            onSlotChange={setSlot}
            info={`Heure de Paris / Genève · ${durationMin} minutes${location ? ` · ${location}` : ""}`}
          />
          {moveState.error && <ErrorBox>{moveState.error}</ErrorBox>}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <button type="submit" disabled={moving || !slot} className={cn(siteButton(), "disabled:cursor-not-allowed disabled:opacity-50")}>
              {moving ? "Enregistrement…" : "Confirmer le nouvel horaire"}
            </button>
            <button type="button" onClick={() => setMode("idle")} className="min-h-11 font-heading text-[15px] font-semibold text-navy underline">
              Retour
            </button>
          </div>
          <p className="jg-small -mt-4" aria-live="polite">
            {slot ? describeSlot(days, slot) : "Choisissez d’abord un horaire."}
          </p>
        </form>
      )}

      {mode === "cancel" && (
        <form action={cancel} className="grid gap-6 rounded-[12px] border border-[var(--jg-light-gray)] bg-ivory p-6 md:p-9">
          <p className="jg-h4 font-heading font-semibold text-navy">Annuler ce rendez-vous ?</p>
          <label className="grid gap-2">
            <span className="font-heading text-[15px] font-semibold text-navy">
              Un mot pour Jérémy <span className="font-sans font-normal">(facultatif)</span>
            </span>
            <textarea name="reason" rows={3} maxLength={500} className={cn(inputClass, "resize-y")} />
          </label>
          {cancelState.error && <ErrorBox>{cancelState.error}</ErrorBox>}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <button type="submit" disabled={cancelling} className={siteButton()}>
              {cancelling ? "Annulation…" : "Oui, annuler le rendez-vous"}
            </button>
            <button type="button" onClick={() => setMode("idle")} className="min-h-11 font-heading text-[15px] font-semibold text-navy underline">
              Garder mon rendez-vous
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-[7px] border border-[#b42318]/30 bg-[#b42318]/5 p-4 font-semibold text-[#b42318]">
      {children}
    </p>
  );
}
