import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SecondStepForm } from "./second-step-form";

export const metadata: Metadata = { title: "Vérification en deux étapes" };

/** Second step of the login, reached right after a correct password when two-step login is on. */
export default function SecondStepPage() {
  return (
    <main className="flex min-h-screen flex-col px-6 py-8 sm:px-10">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-sm">
          <Image src="/brand/jg-logo.svg" alt="Jérémy Galéa — Révéler votre potentiel" width={150} height={107} unoptimized priority className="h-auto dark:hidden" />
          <Image src="/brand/jg-logo-white.svg" alt="Jérémy Galéa — Révéler votre potentiel" width={150} height={107} unoptimized priority className="hidden h-auto dark:block" />
          <h1 className="mt-10 flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ShieldCheck className="size-6 text-primary" /> Vérification
          </h1>
          <span aria-hidden className="mt-2 block h-0.5 w-10 rounded-full bg-gold" />
          <p className="mt-3 mb-8 text-sm text-muted-foreground">
            Votre mot de passe est correct. Pour terminer la connexion, saisissez le code de votre application
            d’authentification.
          </p>
          <SecondStepForm />
          <p className="mt-8 text-xs text-muted-foreground">
            Ce n’est pas vous ?{" "}
            <Link href="/connexion" className="underline underline-offset-2">
              Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
