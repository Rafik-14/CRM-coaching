import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Euro, Percent, Trophy, UserX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { DonutChart } from "@/components/charts";
import { stageDot } from "@/components/stage-badge";
import { getAnalytics } from "@/server/queries/analytics";
import { Button } from "@/components/ui/button";
import { Illustration3D } from "@/components/illustrations/illustration-3d";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analyses" };

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader title="Analyses" description="Comprendre votre activité : conversion, rythme et revenus" />
      <Suspense
        fallback={
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        }
      >
        <Analytics />
      </Suspense>
    </>
  );
}

const pct = (n: number) => `${Math.round(n * 100)} %`;

async function Analytics() {
  const a = await getAnalytics();
  const maxReached = Math.max(1, a.funnel[0]?.reached ?? 1);
  const maxDays = Math.max(1, ...a.funnel.map((f) => f.avgDays));

  return (
    <div className="grid gap-6">
      <section className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card px-6 py-4 sm:flex-row">
        <Illustration3D name="idea" alt="" height={130} />
        <div className="flex-1 text-center sm:text-left">
          <p className="text-[11px] font-semibold tracking-wider text-primary uppercase">Astuce</p>
          {a.staleProspects > 0 ? (
            <>
              <p className="mt-1 text-lg font-semibold">
                {a.staleProspects} prospect{a.staleProspects > 1 ? "s attendent" : " attend"} depuis plus de 14 jours
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Une relance rapide (message, appel) augmente nettement vos chances de conversion.
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-lg font-semibold">Votre pipeline est à jour</p>
              <p className="mt-1 text-sm text-muted-foreground">Aucun prospect n&apos;attend depuis plus de 14 jours.</p>
            </>
          )}
        </div>
        {a.staleProspects > 0 && (
          <Button asChild>
            <Link href="/pipeline">Voir le pipeline</Link>
          </Button>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Taux de conversion" value={pct(a.kpis.conversionRate)} icon={Percent} hint="contacts → clients" />
        <StatCard
          label="Revenus encaissés"
          value={formatMoney(a.kpis.revenueTotal)}
          icon={Euro}
          accent="warning"
          hint={`forfait moyen ${formatMoney(a.kpis.averagePackage)}`}
        />
        <StatCard
          label="Accompagnements réussis"
          value={a.kpis.successRate == null ? "—" : pct(a.kpis.successRate)}
          icon={Trophy}
          accent="success"
          hint="terminés vs arrêtés"
        />
        <StatCard label="Taux d'absence" value={pct(a.kpis.noShowRate)} icon={UserX} accent="info" hint="séances non honorées" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Entonnoir de conversion</h2>
          <p className="mb-5 text-sm text-muted-foreground">Contacts ayant atteint chaque étape</p>
          <ol className="grid gap-3">
            {a.funnel.map((f, i) => {
              const prev = a.funnel[i - 1]?.reached;
              const drop = prev ? 1 - f.reached / prev : null;
              return (
                <li key={f.name} className="grid gap-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2">
                      <span className={cn("size-2 rounded-full", stageDot[f.color] ?? stageDot.slate)} />
                      {f.name}
                    </span>
                    <span className="flex items-center gap-3 tabular-nums">
                      {drop != null && drop > 0 && <span className="text-xs text-destructive">−{pct(drop)}</span>}
                      <span className="font-semibold">{f.reached}</span>
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/50"
                      style={{ width: `${(f.reached / maxReached) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Temps moyen par étape</h2>
          <p className="mb-5 text-sm text-muted-foreground">Jours passés par les contacts actuellement dans l&apos;étape</p>
          <ul className="grid gap-3">
            {a.funnel.map((f) => (
              <li key={f.name} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3 text-sm">
                <span className="truncate text-muted-foreground">{f.name}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", f.avgDays >= 14 ? "bg-destructive/70" : "bg-info/70")}
                    style={{ width: `${(f.avgDays / maxDays) * 100}%` }}
                  />
                </div>
                <span className="text-right font-medium tabular-nums">{f.current ? `${f.avgDays} j` : "—"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-muted-foreground">En rouge : plus de 14 jours, pensez à relancer.</p>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-5 font-semibold">Séances</h2>
          {a.sessions.length ? (
            <DonutChart slices={a.sessions} centerLabel="séances" />
          ) : (
            <p className="text-sm text-muted-foreground">Aucune séance pour le moment.</p>
          )}
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-5 font-semibold">Revenus par forfait</h2>
          {a.revenueByPackage.length ? (
            <ul className="grid gap-4">
              {a.revenueByPackage.map((r) => {
                const max = a.revenueByPackage[0].value || 1;
                return (
                  <li key={r.label} className="grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span>
                        {r.label}
                        <span className="ml-1.5 text-xs text-muted-foreground">× {r.count}</span>
                      </span>
                      <span className="font-semibold tabular-nums">{formatMoney(r.value)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-warning/80" style={{ width: `${(r.value / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun forfait vendu pour le moment.</p>
          )}
        </section>
      </div>
    </div>
  );
}
