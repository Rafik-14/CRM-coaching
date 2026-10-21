import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowLeft, CheckCheck, ExternalLink, Hourglass, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/stat-card";
import { EventActions } from "@/components/events/event-actions";
import { EventForm } from "@/components/events/event-form";
import { RegistrationsPanel } from "@/components/events/registrations-panel";
import { CoverPhoto, RecapPanel } from "@/components/events/recap-panel";
import { getCoachEvent } from "@/server/queries/events";
import { EVENT_KIND_LABEL, EVENT_STATUS_LABEL, isPast, type EventKind, type EventStatus } from "@/lib/events";
import { formatDayTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Événement" };

const TABS = ["inscrits", "infos", "compte-rendu"] as const;

export default function EventPage({ params, searchParams }: PageProps<"/mes-evenements/[id]">) {
  return (
    <>
      <Link href="/mes-evenements" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Événements
      </Link>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <EventDetail params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function EventDetail({
  params,
  searchParams,
}: {
  params: PageProps<"/mes-evenements/[id]">["params"];
  searchParams: PageProps<"/mes-evenements/[id]">["searchParams"];
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await connection();
  const event = await getCoachEvent(id);
  if (!event) notFound();

  const now = new Date();
  const past = isPast(event, now);
  const started = event.startsAt <= now;
  const history = event.manualHistory;
  const defaultTab = TABS.find((t) => t === sp.onglet) ?? (history ? "compte-rendu" : past ? "compte-rendu" : "inscrits");
  const cover = event.photos.find((p) => p.kind === "cover") ?? null;
  const confirmedCount = event.registrations.filter((r) => r.status === "confirmed").length;
  const attendance = event.taken ? Math.round((event.present / event.taken) * 100) : null;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{EVENT_KIND_LABEL[event.kind as EventKind] ?? "Événement"}</Badge>
            <Badge variant={event.status === "published" ? "default" : "secondary"} className={cn(event.status === "cancelled" && "bg-destructive/10 text-destructive")}>
              {EVENT_STATUS_LABEL[event.status as EventStatus] ?? event.status}
            </Badge>
            {history && <Badge variant="outline">Historique</Badge>}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{event.title}</h1>
          <span aria-hidden className="mt-2 block h-0.5 w-10 rounded-full bg-gold" />
          <p className="mt-2 text-sm text-muted-foreground">
            {formatDayTime(event.startsAt)}
            {event.location ? ` · ${event.location}` : event.onlineUrl ? " · En ligne" : ""}
            {event.partner ? ` · avec ${event.partner}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {event.status !== "draft" && (
            <Button variant="outline" asChild>
              <a href={`/evenements/${event.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink /> Voir sur le site
              </a>
            </Button>
          )}
          <EventActions id={event.id} status={event.status} hasRegistrations={event.registrations.length > 0} past={past} />
        </div>
      </div>

      {!history && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={Users} label="Inscrits" value={`${event.taken}${event.capacity ? ` / ${event.capacity}` : ""}`} hint={`${confirmedCount} inscription${confirmedCount > 1 ? "s" : ""}`} />
          <StatCard icon={Hourglass} accent="info" label="Liste d’attente" value={String(event.waiting)} hint={event.waitlistEnabled ? "places demandées" : "désactivée"} />
          <StatCard icon={CheckCheck} accent="success" label="Présents" value={started ? String(event.present) : "—"} hint={started ? (attendance != null ? `${attendance} % des inscrits` : "à cocher dans la liste") : "à cocher le jour J"} />
        </div>
      )}

      <Tabs defaultValue={defaultTab}>
        <TabsList className="h-auto flex-wrap">
          {!history && <TabsTrigger value="inscrits">Inscrits</TabsTrigger>}
          <TabsTrigger value="infos">Informations</TabsTrigger>
          <TabsTrigger value="compte-rendu">Compte rendu</TabsTrigger>
        </TabsList>

        {!history && (
          <TabsContent value="inscrits" className="mt-6">
            <RegistrationsPanel eventId={event.id} registrations={event.registrations} started={started} cancelled={event.status === "cancelled"} />
          </TabsContent>
        )}

        <TabsContent value="infos" className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <Card>
            <CardContent>
              <EventForm event={event} />
            </CardContent>
          </Card>
          <Card className="self-start">
            <CardHeader>
              <CardTitle>Photo de couverture</CardTitle>
              <CardDescription>Affichée sur la liste des événements et en haut de sa page.</CardDescription>
            </CardHeader>
            <CardContent>
              <CoverPhoto eventId={event.id} cover={cover} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compte-rendu" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Compte rendu</CardTitle>
              <CardDescription>
                {past || history
                  ? "Ce que vous montrez de cet événement sur le site : un résumé, des photos et des témoignages."
                  : "À compléter après l’événement. Vous pouvez déjà préparer le texte."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecapPanel
                eventId={event.id}
                recap={event.recap}
                participantsShown={event.participantsShown}
                videoUrl={event.videoUrl}
                showRecap={event.showRecap}
                photos={event.photos}
                quotes={event.quotes}
                suggestedParticipants={event.present}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
