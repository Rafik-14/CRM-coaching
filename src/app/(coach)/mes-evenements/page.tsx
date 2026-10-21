import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { History, Plus, Presentation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { listCoachEvents } from "@/server/queries/events";
import { EVENT_KIND_LABEL, EVENT_STATUS_LABEL, type EventKind, type EventStatus } from "@/lib/events";
import { formatDayTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Événements" };

export default function EventsPage() {
  return (
    <>
      <PageHeader title="Événements" description="Vos conférences et ateliers : inscriptions, présence et historique">
        <Button variant="outline" asChild>
          <Link href="/mes-evenements/nouveau?historique=1">
            <History /> Ajouter un événement passé
          </Link>
        </Button>
        <Button asChild>
          <Link href="/mes-evenements/nouveau">
            <Plus /> Nouvel événement
          </Link>
        </Button>
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <EventLists />
      </Suspense>
    </>
  );
}

type Row = Awaited<ReturnType<typeof listCoachEvents>>["upcoming"][number];

async function EventLists() {
  await connection();
  const { upcoming, past } = await listCoachEvents();
  if (!upcoming.length && !past.length) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={Presentation}
            title="Aucun événement pour le moment"
            description="Créez votre prochaine conférence ou votre prochain atelier : il apparaîtra sur le site, avec les inscriptions en ligne. Vous pouvez aussi ajouter les interventions que vous avez déjà faites."
          />
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid gap-8">
      <EventSection title="À venir" rows={upcoming} empty="Aucun événement à venir." />
      <EventSection title="Passés" rows={past} empty="Pas encore d’événement passé." past />
    </div>
  );
}

function EventSection({ title, rows, empty, past = false }: { title: string; rows: Row[]; empty: string; past?: boolean }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <Card className="py-2">
          <CardContent className="px-4">
            <ul className="divide-y">
              {rows.map((e) => (
                <li key={e.id}>
                  <Link href={`/mes-evenements/${e.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:opacity-80">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {EVENT_KIND_LABEL[e.kind as EventKind] ?? "Événement"} · {formatDayTime(e.startsAt)}
                        {e.location ? ` · ${e.location}` : e.onlineUrl ? " · En ligne" : ""}
                      </p>
                    </div>
                    {!e.manualHistory && (
                      <span className="text-sm tabular-nums">
                        {e.taken}
                        {e.capacity ? ` / ${e.capacity}` : ""} inscrit{e.taken > 1 ? "s" : ""}
                        {e.waiting > 0 && <span className="text-muted-foreground"> · {e.waiting} en attente</span>}
                      </span>
                    )}
                    {e.manualHistory && <Badge variant="outline">Historique</Badge>}
                    {past && !e.manualHistory && !e.showRecap && e.status === "published" && <Badge variant="outline">Compte rendu à faire</Badge>}
                    <Badge
                      variant={e.status === "published" ? "default" : "secondary"}
                      className={cn(e.status === "cancelled" && "bg-destructive/10 text-destructive")}
                    >
                      {EVENT_STATUS_LABEL[e.status as EventStatus] ?? e.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
