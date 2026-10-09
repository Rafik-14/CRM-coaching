import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StageBadge } from "@/components/stage-badge";
import { TaskCheckbox } from "@/components/task-checkbox";
import { Timeline } from "@/components/timeline";
import { EmptyState } from "@/components/illustrations/empty-state";
import { Illustration3D } from "@/components/illustrations/illustration-3d";
import { ScheduleSessionDialog } from "@/components/coaching/schedule-session-dialog";
import { CloseCoachingDialog } from "@/components/coaching/close-coaching-dialog";
import { ReopenCoachingButton } from "@/components/coaching/reopen-coaching-button";
import { SessionCard } from "@/components/coaching/session-card";
import { GoalsPanel } from "@/components/coaching/goals-panel";
import { PackagesPanel } from "@/components/coaching/packages-panel";
import { DocumentsPanel } from "@/components/coaching/documents-panel";
import { DeleteTaskButton, TaskDialog } from "@/components/coaching/task-dialog";
import { getContact, getContactTimeline, getStages } from "@/server/queries/contacts";
import { getActivePackages, getNoteTemplateFields } from "@/server/queries/settings";
import { formatDate, formatDayTime, fullName, isOverdue, isUpcoming } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ContactFormDialog } from "../contact-form-dialog";
import { DeleteContactButton } from "./delete-contact-button";

const TABS = ["apercu", "seances", "objectifs", "taches", "documents", "historique"] as const;
const clientStatusLabel = { active: "Actif", paused: "En pause", finished: "Terminé", stopped: "Arrêté" } as const;

export default function ContactPage({ params, searchParams }: PageProps<"/contacts/[id]">) {
  return (
    <>
      <Link
        href="/contacts"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Contacts
      </Link>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ContactDetail params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ContactDetail({
  params,
  searchParams,
}: {
  params: PageProps<"/contacts/[id]">["params"];
  searchParams: PageProps<"/contacts/[id]">["searchParams"];
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [contact, stages, timeline, templateFields, packageOptions] = await Promise.all([
    getContact(id),
    getStages(),
    getContactTimeline(id),
    getNoteTemplateFields(),
    getActivePackages(),
  ]);
  if (!contact) notFound();
  const tab = TABS.find((t) => t === sp.onglet) ?? "apercu";

  const client = contact.client;
  const active = client?.status === "active";
  const upcoming = contact.sessions.filter((s) => s.status === "planned" && isUpcoming(s.startsAt)).reverse();
  const others = contact.sessions.filter((s) => !(s.status === "planned" && isUpcoming(s.startsAt)));
  const name = fullName(contact);
  const scheduleBlocked = client && !active ? "Accompagnement clôturé : reprenez-le pour planifier." : undefined;
  const openTasks = contact.tasks.filter((t) => !t.done).length;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {client ? `Fiche client · ${clientStatusLabel[client.status]}` : "Fiche prospect"}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
            <StageBadge name={contact.stage?.name ?? null} color={contact.stage?.color ?? null} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                <Mail className="size-4" /> {contact.email}
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                <Phone className="size-4" /> {contact.phone}
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ContactFormDialog stages={stages} contact={contact} />
          {client && <CloseCoachingDialog contactId={contact.id} contactName={name} active={active} />}
          {client && !active && <ReopenCoachingButton contactId={contact.id} />}
          <ScheduleSessionDialog
            contactId={contact.id}
            contactName={name}
            disabledReason={scheduleBlocked}
            prospect={!client}
          />
          <DeleteContactButton id={contact.id} name={name} />
        </div>
      </div>

      {client && !active && client.closedAt && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <span className="font-medium">
            Accompagnement {clientStatusLabel[client.status].toLowerCase()} le {formatDate(client.closedAt)}
          </span>
          {client.closeReason && <span className="text-muted-foreground">· {client.closeReason}</span>}
          {client.closeNote && <span className="w-full text-muted-foreground">{client.closeNote}</span>}
        </div>
      )}

      <Tabs defaultValue={tab}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="apercu">Aperçu</TabsTrigger>
          <TabsTrigger value="seances">
            {client ? "Séances & notes" : "Appels"} <Count n={contact.sessions.length} />
          </TabsTrigger>
          {client && (
            <TabsTrigger value="objectifs">
              Objectifs <Count n={client.goals.length} />
            </TabsTrigger>
          )}
          <TabsTrigger value="taches">
            Tâches <Count n={openTasks} />
          </TabsTrigger>
          {client && (
            <TabsTrigger value="documents">
              Documents <Count n={client.documents.length} />
            </TabsTrigger>
          )}
          <TabsTrigger value="historique">Historique</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------ Aperçu */}
        <TabsContent value="apercu" className="mt-4 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <Info label="Source" value={contact.source} />
                <Info label="Ajouté le" value={formatDate(contact.createdAt)} />
                {client && <Info label="Client depuis" value={formatDate(client.startDate)} />}
                {client && <Info label="Objectif principal" value={client.mainGoal} />}
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Tags</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {contact.tags.length
                      ? contact.tags.map((t) => (
                          <Badge key={t} variant="secondary" className="font-normal">
                            {t}
                          </Badge>
                        ))
                      : "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd className="mt-1 whitespace-pre-wrap">{contact.notes || "—"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <div className="grid content-start gap-6">
            {upcoming[0] && (
              <Card className="gap-1 py-4">
                <CardContent>
                  <p className="text-xs text-muted-foreground uppercase">Prochain rendez-vous</p>
                  <p className="mt-1 font-semibold first-letter:uppercase">{formatDayTime(upcoming[0].startsAt)}</p>
                  <p className="text-xs text-muted-foreground">
                    {upcoming[0].type} · {upcoming[0].location ?? "—"}
                  </p>
                </CardContent>
              </Card>
            )}
            {client && (
              <Card>
                <CardHeader>
                  <CardTitle>Forfaits</CardTitle>
                </CardHeader>
                <CardContent>
                  <PackagesPanel contactId={contact.id} clientPackages={client.packages} options={packageOptions} />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ------------------------------------------------ Séances */}
        <TabsContent value="seances" className="mt-4 grid gap-4">
          {(active || !client) && upcoming.length === 0 && (
            <Card>
              <CardContent>
                <EmptyState
                  illustration="sitting-normal"
                  layout="horizontal"
                  size={120}
                  title={client ? "Aucune séance prévue" : "Aucun appel prévu"}
                  description={
                    client
                      ? `Planifiez la prochaine séance avec ${contact.firstName} pour garder le rythme.`
                      : `Proposez un appel découverte à ${contact.firstName} pour faire connaissance.`
                  }
                  action={<ScheduleSessionDialog contactId={contact.id} contactName={name} prospect={!client} />}
                  className="py-2"
                />
              </CardContent>
            </Card>
          )}
          {contact.sessions.length > 0 && (
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-muted/40 px-4 py-3">
              <Illustration3D name="shhh" alt="" height={96} disc={false} />
              <p className="text-sm">
                <span className="font-medium">Vos notes de séance sont privées.</span>{" "}
                <span className="text-muted-foreground">Elles ne sont visibles que par vous, jamais par le client.</span>
              </p>
            </div>
          )}
          {/* One keyed list (titles + cards) so a card keeps its state when it moves between sections,
              e.g. "Marquer effectuée" then opening the note dialog. */}
          {[
            ...(upcoming.length ? [{ key: "h-up", title: "À venir" }] : []),
            ...upcoming.map((s) => ({ key: s.id, session: s, upcoming: true })),
            ...(others.length ? [{ key: "h-past", title: "Historique" }] : []),
            ...others.map((s) => ({ key: s.id, session: s, upcoming: false })),
          ].map((item) =>
            "title" in item ? (
              <SectionTitle key={item.key}>{item.title}</SectionTitle>
            ) : (
              <SessionCard
                key={item.key}
                session={item.session}
                templateFields={templateFields}
                upcoming={item.upcoming}
              />
            ),
          )}
        </TabsContent>

        {/* ------------------------------------------------ Objectifs */}
        {client && (
          <TabsContent value="objectifs" className="mt-4">
            <GoalsPanel contactId={contact.id} goals={client.goals} />
          </TabsContent>
        )}

        {/* ------------------------------------------------ Tâches */}
        <TabsContent value="taches" className="mt-4 grid gap-4">
          <div className="flex justify-end">
            <TaskDialog fixedContactId={contact.id} />
          </div>
          <Card className="py-2">
            <CardContent className="px-4">
              {contact.tasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Aucune tâche pour ce contact.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {contact.tasks.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 py-2.5">
                      <TaskCheckbox id={t.id} done={t.done} />
                      <span className={cn("flex-1 text-sm", t.done && "text-muted-foreground line-through")}>
                        {t.title}
                      </span>
                      <span
                        className={cn(
                          "text-xs",
                          isOverdue(t.dueAt, t.done) ? "font-medium text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {formatDate(t.dueAt)}
                      </span>
                      <TaskDialog task={t} fixedContactId={contact.id} />
                      <DeleteTaskButton id={t.id} title={t.title} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------ Documents */}
        {client && (
          <TabsContent value="documents" className="mt-4">
            <DocumentsPanel contactId={contact.id} documents={client.documents} />
          </TabsContent>
        )}

        {/* ------------------------------------------------ Historique */}
        <TabsContent value="historique" className="mt-4">
          <Card>
            <CardContent>
              <Timeline events={timeline} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Count({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground tabular-nums">{n}</span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{children}</h3>;
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1">{value || "—"}</dd>
    </div>
  );
}
