"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import type { AvailableDay } from "@/lib/booking";
import { cn } from "@/lib/utils";
import { bookClientSession, type ClientBookingState } from "@/server/actions/client-booking";
import { siteButton } from "./button";
import { inputClass } from "./form";
import { SlotPicker, describeSlot } from "./slot-picker";

/** /reserver/seance/<token>: an existing client picks the slot of their next session (identity known from the link). */
export function ClientBookingWidget({
  token,
  days,
  durationMin,
  location,
}: {
  token: string;
  days: AvailableDay[];
  durationMin: number;
  location: string;
}) {
  const router = useRouter();
  const [slot, setSlot] = useState("");
  const [state, action, pending] = useActionState<ClientBookingState, FormData>(async (prev, fd) => {
    const r = await bookClientSession(token, prev, fd);
    if (r.error) router.refresh(); // fresh slots
    return r;
  }, {});

  return (
    <form action={action} className="grid gap-10">
      <input type="hidden" name="slot" value={slot} />
      <SlotPicker
        days={days}
        slot={slot}
        onSlotChange={setSlot}
        info={`Heure de Paris / Genève · ${durationMin} minutes · ${location}`}
        numbers={["01", "02"]}
      />
      <label className="grid gap-2">
        <span className="font-heading text-[1.125rem] font-semibold text-navy">
          <span className="text-gold" aria-hidden>
            03 —{" "}
          </span>
          Un mot pour préparer la séance <span className="font-sans text-[15px] font-normal">(facultatif)</span>
        </span>
        <textarea name="message" rows={3} maxLength={1000} className={cn(inputClass, "resize-y")} />
      </label>
      {state.error && (
        <p role="alert" className="rounded-[7px] border border-[#b42318]/30 bg-[#b42318]/5 p-4 font-semibold text-[#b42318]">
          {state.error}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <button type="submit" disabled={pending || !slot} className={cn(siteButton(), "disabled:cursor-not-allowed disabled:opacity-50")}>
          <CalendarCheck aria-hidden />
          {pending ? "Réservation en cours…" : "Confirmer ma séance"}
        </button>
        <p className="jg-small" aria-live="polite">
          {slot ? describeSlot(days, slot) : "Choisissez d’abord un horaire."}
        </p>
      </div>
    </form>
  );
}
