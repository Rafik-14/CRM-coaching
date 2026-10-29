"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Unexpected error on a CRM page: the sidebar and header stay, only the page area shows this. */
export default function CrmError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = (error as { digest?: string } | null)?.digest;

  return (
    <div className="mx-auto grid max-w-lg justify-items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" />
      </span>
      <h1 className="text-xl font-semibold">Un problème est survenu</h1>
      <p className="text-sm text-muted-foreground">
        Cette page n’a pas pu s’afficher. Vos données ne sont pas perdues : réessayez, ou revenez au tableau de bord.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => retry()}>Réessayer</Button>
        <Button asChild variant="outline">
          <Link href="/tableau-de-bord">Tableau de bord</Link>
        </Button>
      </div>
      {digest && <p className="text-xs text-muted-foreground">Référence de l’erreur : {digest}</p>}
    </div>
  );
}
