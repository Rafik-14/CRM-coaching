import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { EventForm } from "@/components/events/event-form";
import { requireCoach } from "@/server/dal";

export const metadata: Metadata = { title: "Nouvel événement" };

export default function NewEventPage({ searchParams }: PageProps<"/mes-evenements/nouveau">) {
  return (
    <>
      <Link href="/mes-evenements" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Événements
      </Link>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <NewEvent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NewEvent({ searchParams }: { searchParams: PageProps<"/mes-evenements/nouveau">["searchParams"] }) {
  await requireCoach();
  const history = (await searchParams).historique === "1";
  return (
    <>
      <PageHeader
        title={history ? "Ajouter un événement passé" : "Nouvel événement"}
        description={
          history
            ? "Une conférence ou un atelier que vous avez déjà animé : il rejoint l’historique du site. Vous ajouterez photos et témoignages ensuite."
            : "Il reste en brouillon tant que vous ne le publiez pas."
        }
      />
      <Card>
        <CardContent>
          <EventForm history={history} />
        </CardContent>
      </Card>
    </>
  );
}
