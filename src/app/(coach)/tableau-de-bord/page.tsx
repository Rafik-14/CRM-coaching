import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, CalendarCheck, Euro, UserPlus, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StageBadge } from "@/components/stage-badge";
import { StatCard } from "@/components/stat-card";
import { TaskCheckbox } from "@/components/task-checkbox";
import { DonutChart, SessionsBarChart } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { Illustration3D } from "@/components/illustrations/illustration-3d";
import { EmptyState } from "@/components/illustrations/empty-state";
import { getDashboard } from "@/server/queries/dashboard";
import { formatDate, formatDayTime, formatMoney, fullName, initials, isOverdue } from "@/lib/format";

export const metadata: Metadata = { title: "Tableau de bord" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-5 ${className ?? ""}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const SeeAll = ({ href }: { href: string }) => (
  <Link href={href} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
    Tout voir <ArrowUpRight className="size-3.5" />
  </Link>
);

async function Dashboard() {
  const d = await getDashboard();
  const hour = new Date().getHours();
  const hello = hour < 18 ? "Bonjour" : "Bonsoir";

  return (
    <div className="grid gap-6">
      <section className="flex items-center justify-between gap-6 overflow-hidden rounded-2xl border border-border bg-card px-6 py-5 sm:px-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {hello}, <span className="text-primary">{d.firstName}</span>.
          </h1>
          <p className="mt-2 text-muted-foreground">
            {d.sessionsToday > 0
              ? `Vous avez ${d.sessionsToday} séance${d.sessionsToday > 1 ? "s" : ""} aujourd'hui.`
              : "Aucune séance aujourd'hui : un bon moment pour relancer vos prospects."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/pipeline">Voir le pipeline</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/taches">Mes tâches</Link>
            </Button>
          </div>
        </div>
        <Illustration3D
          name={d.sessionsToday > 0 ? "walking-happy" : "sitting-relaxed"}
          alt=""
          height={150}
          priority
          className="hidden sm:block"
        />
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clients actifs" value={d.stats.activeClients} icon={Users} />
        <StatCard
          label="Nouveaux contacts"
          value={d.stats.newLeads.value}
          icon={UserPlus}
          accent="info"
          trend={d.stats.newLeads.trend}
          hint="30 derniers jours"
        />
        <StatCard
          label="Séances effectuées"
          value={d.stats.sessionsDone.value}
          icon={CalendarCheck}
          accent="success"
          trend={d.stats.sessionsDone.trend}
          hint="30 derniers jours"
        />
        <StatCard
          label="Chiffre d'affaires"
          value={formatMoney(d.stats.revenue.value)}
          icon={Euro}
          accent="warning"
          trend={d.stats.revenue.trend}
          hint="forfaits payés · 30 j"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Séances par semaine" className="lg:col-span-2">
          <SessionsBarChart weeks={d.weeks} />
        </Panel>
        <Panel title="Sources des contacts">
          <DonutChart slices={d.sourceSlices.map((s) => ({ label: s.source, value: s.n }))} centerLabel="contacts" />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Prochaines séances">
          {d.upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune séance prévue cette semaine.</p>
          ) : (
            <ul className="grid gap-2">
              {d.upcoming.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/contacts/${s.contact.id}`}
                    className="flex items-center gap-3 rounded-xl bg-muted/50 p-3 transition-colors hover:bg-muted"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-semibold text-primary">
                      {initials(fullName(s.contact))}
                    </span>
                    <span className="grid min-w-0 flex-1">
                      <span className="truncate font-medium">{fullName(s.contact)}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.type} · {s.location ?? "—"}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm text-muted-foreground tabular-nums first-letter:uppercase">
                      {formatDayTime(s.startsAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Tâches à faire" action={<SeeAll href="/taches" />}>
          {d.dueTasks.length === 0 ? (
            <EmptyState
              illustration="sitting-happy"
              size={110}
              layout="horizontal"
              title="Tout est fait"
              description="Aucune tâche en attente. Profitez-en !"
              className="py-2"
            />
          ) : (
            <ul className="divide-y divide-border">
              {d.dueTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <TaskCheckbox id={t.id} done={t.done} />
                  <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                  <span
                    className={
                      isOverdue(t.dueAt, t.done)
                        ? "text-xs font-medium text-destructive"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {formatDate(t.dueAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Derniers contacts" action={<SeeAll href="/contacts" />}>
        <ul className="divide-y divide-border">
          {d.recentContacts.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-info/15 text-xs font-semibold text-info">
                {initials(fullName(c))}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/contacts/${c.id}`} className="font-medium hover:underline">
                  {fullName(c)}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {c.source ?? "Source inconnue"} · {formatDate(c.createdAt)}
                </p>
              </div>
              <span className="hidden text-sm font-semibold tabular-nums sm:block">
                {c.estimatedValue ? formatMoney(c.estimatedValue) : ""}
              </span>
              <StageBadge name={c.stageName} color={c.stageColor} />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-16 w-80" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}
