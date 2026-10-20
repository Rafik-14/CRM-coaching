"use client";

import { useState, useTransition } from "react";
import { setEmailPreference } from "@/server/actions/email-preferences";
import { cn } from "@/lib/utils";
import { siteButton } from "./button";

/** One button to stop (or resume) the non-essential e-mails. */
export function EmailPreference({ token, optedOut }: { token: string; optedOut: boolean }) {
  const [off, setOff] = useState(optedOut);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const change = (next: boolean) =>
    startTransition(async () => {
      const r = await setEmailPreference(token, next);
      if (r.error) setError(r.error);
      else {
        setError(null);
        setOff(next);
      }
    });

  return (
    <div className="mt-8 grid gap-4" aria-live="polite">
      <p className="max-w-[640px]">
        {off
          ? "C’est noté : vous ne recevrez plus les e-mails de suivi et de remerciement. Les confirmations et rappels de vos rendez-vous continuent d’arriver."
          : "Vous recevez des e-mails de suivi (après un échange, en fin d’accompagnement…). Les confirmations et rappels de vos rendez-vous ne sont pas concernés."}
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => change(!off)}
        className={cn(siteButton({ variant: off ? "secondary" : "primary" }), "justify-self-start disabled:opacity-50")}
      >
        {off ? "Recevoir à nouveau ces e-mails" : "Ne plus recevoir ces e-mails"}
      </button>
      {error && (
        <p role="alert" className="font-semibold text-[#b42318]">
          {error}
        </p>
      )}
    </div>
  );
}
