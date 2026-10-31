"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifySecondStep, type SecondStepState } from "@/server/actions/two-factor";

/** Code from the authenticator app (default) or a backup code, and « trust this device for 30 days ». */
export function SecondStepForm() {
  const [state, action, pending] = useActionState<SecondStepState, FormData>(verifySecondStep, {});
  const [mode, setMode] = useState<"app" | "backup">("app");

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="mode" value={mode} />
      <div className="grid gap-2">
        <Label htmlFor="code">{mode === "app" ? "Code à 6 chiffres" : "Code de secours"}</Label>
        <Input
          key={mode}
          id="code"
          name="code"
          className="h-11 text-center text-lg tracking-[0.3em]"
          autoComplete="one-time-code"
          inputMode={mode === "app" ? "numeric" : "text"}
          pattern={mode === "app" ? "[0-9 ]*" : undefined}
          maxLength={mode === "app" ? 7 : 20}
          autoFocus
          required
          aria-describedby="code-help"
        />
        <p id="code-help" className="text-xs text-muted-foreground">
          {mode === "app"
            ? "Ouvrez votre application d’authentification et saisissez le code affiché pour « Jérémy Galéa CRM »."
            : "Un des 10 codes de secours enregistrés à l’activation. Chaque code ne sert qu’une fois."}
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="trust" className="size-4 accent-[var(--jg-navy)]" />
        Faire confiance à cet appareil pendant 30 jours
      </label>
      {state.error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}{" "}
          {state.expired && (
            <Link href="/connexion" className="font-medium underline underline-offset-2">
              Se reconnecter
            </Link>
          )}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-11">
        {pending && <Loader2 className="animate-spin" />}
        Vérifier
      </Button>
      <button
        type="button"
        onClick={() => setMode(mode === "app" ? "backup" : "app")}
        className="justify-self-start text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        {mode === "app" ? "Téléphone indisponible ? Utiliser un code de secours" : "Utiliser l’application d’authentification"}
      </button>
    </form>
  );
}
