import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, Banknote, CalendarCheck, ListChecks, UserPlus, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StageBadge } from "@/components/stage-badge";
import { StatCard } from "@/components/stat-card";
import { TaskCheckbox } from "@/components/task-checkbox";
import { DonutChart } from "@/components/charts";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { SessionsChart } from "@/components/dashboard/sessions-chart";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { getDashboard } from "@/server/queries/dashboard";
import {
  APP_TIME_ZONE,
  formatDate,
  formatDayTime,
  formatMoney,
  formatMoneyTotals,
  fullName,
  initials,
  isOverdue,
} from "@/lib/format";

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
  description,
  action,
  children,
  className,
}: {
  title: string;
  /** One line under the title: what the chart or list shows. */
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-2xl border border-border bg-card p-5 ${className ?? ""}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="mt-1 max-w-prose text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const monthShort = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: APP_TIME_ZONE });
const monthLong = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: APP_TIME_ZONE });
const dayMonth = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: APP_TIME_ZONE });
const dayMonthLong = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: APP_TIME_ZONE });

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
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {hello}, {d.firstName}.
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
        {/* Méthode JG® reminder instead of an illustration (the brand bans 3D / generic artwork) */}
        <div className="hidden shrink-0 border-l border-border pl-6 md:block" aria-hidden>
          <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">Méthode JG®</p>
          <p className="mt-2 grid gap-1 font-heading text-sm font-semibold tracking-[0.12em] text-heading">
            <span>CLARIFIER</span>
            <span>RÉVÉLER</span>
            <span>INCARNER</span>
          </p>
          <span className="mt-3 block h-0.5 w-8 rounded-full bg-gold" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Clients actifs"
          value={d.stats.activeClients}
          icon={Users}
          hint="en accompagnement aujourd’hui"
          spark={{ values: d.months.slice(-6).map((m) => m.clients), label: "nouveaux clients · 6 mois" }}
        />
        <StatCard
          label="Nouveaux contacts"
          value={d.stats.newLeads.value}
          icon={UserPlus}
          accent="info"
          trend={d.stats.newLeads.trend}
          hint={`sur 30 j · contre ${d.stats.newLeads.previous} les 30 j d’avant`}
          detail="Personnes ajoutées au CRM (site, recommandation, événement…)."
          spark={{ values: d.months.slice(-6).map((m) => m.contacts), label: "par mois · 6 mois" }}
        />
        <StatCard
          label="Séances effectuées"
          value={d.stats.sessionsDone.value}
          icon={CalendarCheck}
          accent="success"
          trend={d.stats.sessionsDone.trend}
          hint={`sur 30 j · contre ${d.stats.sessionsDone.previous} les 30 j d’avant`}
          detail="Séances marquées « effectuées », absences exclues."
          spark={{ values: d.weeks.filter((w) => !w.current).map((w) => w.done), label: "par semaine · 7 sem." }}
        />
        <StatCard
          label="Chiffre d'affaires"
          value={formatMoneyTotals(d.stats.revenue.value)}
          icon={Banknote}
          accent="warning"
          trend={d.stats.revenue.trend}
          hint="accompagnements payés · 30 j"
          detail="Euros et francs suisses comptés séparément, sans conversion."
        />
      </div>

      <Panel
        title="Activité des 12 derniers mois"
        description="Chaque mois : combien de personnes vous ont contacté, combien ont fait l’échange stratégique, et combien sont devenues clientes. Survolez le graphique pour le détail d’un mois."
      >
        <ActivityChart
          months={d.months.map((m) => ({
            key: m.key,
            label: monthShort.format(m.start),
            longLabel: monthLong.format(m.start),
            contacts: m.contacts,
            calls: m.calls,
            clients: m.clients,
          }))}
        />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          title="Séances par semaine"
          description="Séances effectuées et prévues sur les 8 dernières semaines. Le trait pointillé indique votre moyenne."
          className="lg:col-span-2"
        >
          <SessionsChart
            weeks={d.weeks.map((w) => ({
              key: w.start.toISOString(),
              label: w.current ? "Cette sem." : dayMonth.format(w.start),
              longLabel: `Semaine du ${dayMonthLong.format(w.start)}`,
              done: w.done,
              planned: w.planned,
              current: w.current,
            }))}
          />
        </Panel>
        <Panel title="Sources des contacts" description="D’où viennent vos contacts : nombre et part de chaque source.">
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
              icon={ListChecks}
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
                {c.estimatedValue ? formatMoney(c.estimatedValue, c.currency) : ""}
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
