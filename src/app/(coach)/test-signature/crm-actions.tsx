"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resendReport, scheduleCallback, updateCallback } from "@/server/actions/revelateur-crm";

/** Buttons to move a callback request along (annexe 07 §6.2). A callback never becomes an appointment by itself. */
export function CallbackActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState("");
  const [when, setWhen] = useState("");
  const run = (s: "in_progress" | "completed" | "cancelled") =>
    start(async () => {
      const r = await updateCallback(id, s, outcome);
      (r.ok ? toast.success : toast.error)(r.message);
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "pending" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run("in_progress")}>
          En cours
        </Button>
      )}
      <Input value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="Issue (facultatif)" className="h-8 w-44" maxLength={500} />
      <Button size="sm" disabled={pending} onClick={() => run("completed")}>
        Rappel effectué
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("cancelled")}>
        Annuler
      </Button>
      <span className="flex items-center gap-2">
        <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="h-8 w-48" aria-label="Date et heure de l’appel découverte" />
        <Button
          size="sm"
          variant="outline"
          disabled={pending || !when}
          onClick={() =>
            start(async () => {
              // The input is in the coach's local time; send an absolute instant.
              const r = await scheduleCallback(id, new Date(when).toISOString());
              (r.ok ? toast.success : toast.error)(r.message);
            })
          }
        >
          Planifier l’appel découverte
        </Button>
      </span>
    </div>
  );
}

/** Re-send the same report, optionally to a corrected address (v2.0 §4: no new test, no recalculation). */
export function ResendReport({ sessionId }: { sessionId: string }) {
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await resendReport(sessionId, email);
          (r.ok ? toast.success : toast.error)(r.message);
          if (r.ok) setEmail("");
        });
      }}
    >
      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Nouvelle adresse (facultatif)" className="h-8 w-60" />
      <Button size="sm" type="submit" disabled={pending}>
        {email ? "Corriger et renvoyer" : "Renvoyer le rapport"}
      </Button>
    </form>
  );
}
