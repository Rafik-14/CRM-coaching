"use client";

import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { startPayment } from "@/server/actions/payment";
import { siteButton } from "./button";

export function PayButton({ token, label }: { token: string; label: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await startPayment(token);
            if (r?.error) setError(r.error);
          })
        }
        className={cn(siteButton(), "justify-self-start disabled:opacity-50")}
      >
        <CreditCard aria-hidden /> {pending ? "Ouverture du paiement…" : label}
      </button>
      {error && (
        <p role="alert" className="font-semibold text-[#b42318]">
          {error}
        </p>
      )}
    </div>
  );
}
