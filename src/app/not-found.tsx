import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/illustrations/empty-state";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <EmptyState
        illustration="confused"
        size={220}
        title="Page introuvable"
        description="Cette page n'existe pas ou a été supprimée."
        action={
          <Button asChild>
            <Link href="/tableau-de-bord">Retour au tableau de bord</Link>
          </Button>
        }
      />
    </main>
  );
}
