import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import portrait from "@/assets/brand/jg-portrait.webp";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Left: login panel */}
      <section className="flex flex-col px-6 py-8 sm:px-10">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <Image src="/brand/jg-logo.svg" alt="Jérémy Galéa — Révéler votre potentiel" width={190} height={136} unoptimized priority className="dark:hidden" />
            <Image src="/brand/jg-logo-white.svg" alt="Jérémy Galéa — Révéler votre potentiel" width={190} height={136} unoptimized priority className="hidden dark:block" />
            <h1 className="mt-10 text-2xl font-semibold tracking-tight">Bon retour</h1>
            <span aria-hidden className="mt-2 block h-0.5 w-10 rounded-full bg-gold" />
            <p className="mt-3 mb-8 text-sm text-muted-foreground">
              Connectez-vous pour retrouver vos contacts, vos accompagnements et vos séances.
            </p>
            <LoginForm />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Espace privé · Vos données sont protégées et hébergées en Europe.
        </p>
      </section>

      {/* Right: portrait (hidden on small screens) */}
      <aside className="relative hidden overflow-hidden bg-navy lg:block">
        <Image
          src={portrait}
          alt="Jérémy Galéa"
          fill
          priority
          placeholder="blur"
          sizes="50vw"
          className="object-cover object-[50%_20%]"
        />
        <div className="absolute right-10 bottom-10 left-10 max-w-md rounded-xl bg-navy px-7 py-6 text-white">
          <p className="font-heading text-xl leading-snug font-semibold text-balance">Révéler votre potentiel</p>
          <span aria-hidden className="mt-3 block h-0.5 w-10 rounded-full bg-gold" />
          <p className="mt-3 text-sm text-white/80">
            Contacts, accompagnements, séances et Méthode JG® : tout au même endroit.
          </p>
        </div>
      </aside>
    </main>
  );
}
