import type { Metadata } from "next";
import { HeartHandshake } from "lucide-react";
import { LoginForm } from "./login-form";
import { Illustration3D } from "@/components/illustrations/illustration-3d";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Left: login panel */}
      <section className="flex flex-col px-6 py-8 sm:px-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HeartHandshake className="size-4" />
            </span>
            CRM Coaching
          </div>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold tracking-tight">Bon retour</h1>
            <p className="mt-1 mb-8 text-sm text-muted-foreground">
              Connectez-vous pour retrouver vos clients et vos séances.
            </p>
            <LoginForm />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Espace privé · Vos données sont protégées et hébergées en Europe.
        </p>
      </section>

      {/* Right: artwork (hidden on small screens) */}
      <aside className="relative hidden flex-col items-center justify-center gap-10 overflow-hidden bg-secondary px-10 lg:flex dark:bg-card">
        <Illustration3D name="waving" alt="" height={360} priority />
        <div className="max-w-md text-center">
          <p className="text-2xl leading-snug font-semibold text-balance">
            Chaque pas compte. Accompagnez vos clients, étape par étape.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">Contacts, séances, objectifs : tout au même endroit.</p>
        </div>
      </aside>
    </main>
  );
}
