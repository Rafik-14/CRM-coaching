import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, ListChecks } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StageBadge } from "@/components/stage-badge";
import { TaskCheckbox } from "@/components/task-checkbox";
import { NewContactButton } from "@/components/new-contact-button";
import { EmptyState } from "@/components/empty-state";
import { getHome } from "@/server/queries/dashboard";
import { formatDate, formatDayTime, formatMoneyTotals, fullName, initials, isOverdue } from "@/lib/format";

export const metadata: Metadata = { title: "Accueil" };

/**
 * Home screen of the simplified CRM (Jérémy, Nov. 2026): his clients first, then his earnings, then today and his
 * to-dos at the bottom. No pipeline and no charts here.
 */
export default function DashboardPage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Home />
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
    <section className={`min-w-0 rounded-2xl border border-border bg-card p-5 ${className ?? ""}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const SeeAll = ({ href, label = "Tout voir" }: { href: string; label?: string }) => (
  <Link href={href} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
    {label} <ArrowUpRight className="size-3.5" />
  </Link>
);

function Money({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-muted/50 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

async function Home() {
  const d = await getHome();
  const hour = new Date().getHours();
  const hello = hour < 18 ? "Bonjour" : "Bonsoir";

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {hello}, {d.firstName}.
          </h1>
          <p className="mt-1 text-muted-foreground">
            {d.sessionsToday > 0
              ? `Vous avez ${d.sessionsToday} séance${d.sessionsToday > 1 ? "s" : ""} aujourd'hui.`
              : "Aucune séance aujourd'hui."}
          </p>
        </div>
        <NewContactButton />
      </div>

      {/* 1 · Clients */}
      <Panel title="Mes clients" action={<SeeAll href="/contacts" />}>
        {d.activeClients.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun client en accompagnement pour le moment.</p>
        ) : (
          <ul className="divide-y divide-border">
            {d.activeClients.map((c) => (
              <li key={c.contactId}>
                <Link
                  href={`/contacts/${c.contactId}`}
                  className="flex items-center gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-muted/50"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-semibold text-primary">
                    {initials(fullName(c))}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{fullName(c)}</span>
                  <span className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground sm:block">
                    {c.packageName ?? "—"}
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                    {c.sessionsCount ? `Séance ${Math.min(c.sessionsUsed ?? 0, c.sessionsCount)} / ${c.sessionsCount}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {d.newContacts.length > 0 && (
          <>
            <h3 className="mt-6 mb-2 text-sm font-medium text-muted-foreground">Nouveaux contacts</h3>
            <ul className="divide-y divide-border">
              {d.newContacts.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/contacts/${c.id}`}
                    className="flex items-center gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-muted/50"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-info/15 text-xs font-semibold text-info">
                      {initials(fullName(c))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{fullName(c)}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.source ?? "Source inconnue"} · {formatDate(c.createdAt)}
                      </span>
                    </span>
                    <StageBadge name={c.stageName} color={c.stageColor} />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      {/* 2 · Earnings */}
      <Panel title="Mes revenus">
        <div className="grid gap-3 sm:grid-cols-3">
          <Money label="Ce mois-ci" value={formatMoneyTotals(d.earnings.month)} />
          <Money label="Cette année" value={formatMoneyTotals(d.earnings.year)} />
          <Money label="Clients en accompagnement" value={d.earnings.activeClients} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Accompagnements payés (ou en partie). Euros et francs suisses comptés séparément, sans conversion.
        </p>
      </Panel>

      {/* 3 · Today and to-dos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Prochaines séances" action={<SeeAll href="/calendrier" label="Agenda" />}>
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

        <Panel title="À faire" action={<SeeAll href="/taches" />}>
          {d.dueTasks.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              layout="horizontal"
              title="Tout est fait"
              description="Aucune tâche en attente."
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
                      isOverdue(t.dueAt, t.done) ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"
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
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-16 w-80" />
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-36 rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    </div>
  );
}
