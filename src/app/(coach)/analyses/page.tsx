import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Banknote, Lightbulb, Percent, Trophy, UserX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getEventStats } from "@/server/queries/events";
import { DonutChart } from "@/components/charts";
import { stageDot } from "@/components/stage-badge";
import { getAnalytics } from "@/server/queries/analytics";
import { Button } from "@/components/ui/button";
import { IconMark } from "@/components/empty-state";
import { AnimateOnView, CountUp } from "@/components/animate";
import { formatMoneyTotals } from "@/lib/format";
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
      <section className="flex flex-col items-center gap-5 rounded-xl border border-border bg-card px-6 py-5 sm:flex-row">
        <IconMark icon={Lightbulb} />
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
          value={formatMoneyTotals(a.kpis.revenueTotal, a.mainCurrency)}
          icon={Banknote}
          accent="warning"
          hint={`accompagnement moyen ${formatMoneyTotals(a.kpis.averagePackage, a.mainCurrency)}`}
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

      <div className="grid gap-6 lg:grid-cols-3">
        <AnimateOnView className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Échange stratégique → client</h2>
          <p className="mb-4 text-sm text-muted-foreground">Contacts ayant eu leur échange, devenus clients</p>
          <p className="font-heading text-3xl font-semibold text-heading tabular-nums">
            <CountUp value={a.echange.held ? pct(a.echange.converted / a.echange.held) : "—"} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {a.echange.converted} client{a.echange.converted > 1 ? "s" : ""} sur {a.echange.held} échange
            {a.echange.held > 1 ? "s" : ""} effectué{a.echange.held > 1 ? "s" : ""}
          </p>
        </AnimateOnView>
        <AnimateOnView className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 font-semibold">Par type de client</h2>
          <ul className="grid gap-3">
            {a.segments.map((s, i) => (
              <li key={s.label} className="grid gap-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate">{s.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {s.clients} client{s.clients > 1 ? "s" : ""} / {s.contacts}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="animate-grow-x h-full rounded-full bg-primary"
                    style={{
                      width: `${(s.contacts / Math.max(1, a.segments[0]?.contacts ?? 1)) * 100}%`,
                      animationDelay: `${i * 70}ms`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </AnimateOnView>
        <AnimateOnView className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Partenaires</h2>
          <p className="mb-4 text-sm text-muted-foreground">Contacts recommandés · devenus clients</p>
          {a.partners.length ? (
            <ul className="grid gap-2.5">
              {a.partners.map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <Link href={`/contacts/${p.id}`} className="truncate hover:underline">
                    {p.name}
                  </Link>
                  <span className="shrink-0 tabular-nums">
                    {p.referred} <span className="text-muted-foreground">·</span> {p.clients}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune recommandation pour le moment. Indiquez « Recommandé par » sur la fiche d&apos;un contact.
            </p>
          )}
        </AnimateOnView>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnimateOnView className="rounded-xl border border-border bg-card p-5">
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
                      <CountUp value={String(f.reached)} className="font-semibold" />
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className="animate-grow-x h-full rounded-full bg-primary"
                      style={{ width: `${(f.reached / maxReached) * 100}%`, animationDelay: `${i * 70}ms` }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </AnimateOnView>

        <AnimateOnView className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Temps moyen par étape</h2>
          <p className="mb-5 text-sm text-muted-foreground">Jours passés par les contacts actuellement dans l&apos;étape</p>
          <ul className="grid gap-3">
            {a.funnel.map((f, i) => (
              <li key={f.name} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3 text-sm">
                <span className="truncate text-muted-foreground">{f.name}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("animate-grow-x h-full rounded-full", f.avgDays >= 14 ? "bg-destructive/70" : "bg-info/70")}
                    style={{ width: `${(f.avgDays / maxDays) * 100}%`, animationDelay: `${i * 70}ms` }}
                  />
                </div>
                <CountUp value={f.current ? `${f.avgDays} j` : "—"} className="text-right font-medium tabular-nums" />
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-muted-foreground">En rouge : plus de 14 jours, pensez à relancer.</p>
        </AnimateOnView>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnimateOnView className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-5 font-semibold">Séances</h2>
          {a.sessions.length ? (
            <DonutChart slices={a.sessions} centerLabel="séances" />
          ) : (
            <p className="text-sm text-muted-foreground">Aucune séance pour le moment.</p>
          )}
        </AnimateOnView>
        <AnimateOnView className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-5 font-semibold">Revenus par accompagnement</h2>
          {a.revenueByPackage.length ? (
            <ul className="grid gap-4">
              {a.revenueByPackage.map((r, i) => {
                const max = a.revenueByPackage[0].value[a.mainCurrency] || 1;
                const main = r.value[a.mainCurrency] ?? 0;
                return (
                  <li key={r.label} className="grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span>
                        {r.label}
                        <span className="ml-1.5 text-xs text-muted-foreground">× {r.count}</span>
                      </span>
                      <CountUp value={formatMoneyTotals(r.value, a.mainCurrency)} className="font-semibold tabular-nums" />
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="animate-grow-x h-full rounded-full bg-gold"
                        style={{ width: `${(main / max) * 100}%`, animationDelay: `${i * 90}ms` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun accompagnement vendu pour le moment.</p>
          )}
        </AnimateOnView>
      </div>

      <AnimateOnView className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Transformations</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Accompagnements terminés rédigés en étude de cas, avec l&apos;accord du client : prêts pour votre site.
        </p>
        {a.transformations.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {a.transformations.map((t) => (
              <article key={t.id} className="grid content-start gap-3 rounded-xl border border-border p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <Link href={`/contacts/${t.contact.id}`} className="font-heading font-semibold text-heading hover:underline">
                    {t.contact.firstName}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {[t.contact.stake, t.contact.organization].filter(Boolean).join(" · ")}
                  </span>
                </div>
                {t.positioningStatement && (
                  <blockquote className="border-l-2 border-gold pl-3 text-sm font-semibold text-heading">
                    « {t.positioningStatement} »
                  </blockquote>
                )}
                <dl className="grid gap-2 text-sm">
                  {t.caseStudy?.before && (
                    <div>
                      <dt className="text-[11px] tracking-wider text-muted-foreground uppercase">Avant</dt>
                      <dd>{t.caseStudy.before}</dd>
                    </div>
                  )}
                  {t.caseStudy?.after && (
                    <div>
                      <dt className="text-[11px] tracking-wider text-muted-foreground uppercase">Après</dt>
                      <dd>{t.caseStudy.after}</dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucune pour le moment. Elles se remplissent en clôturant un accompagnement « Terminé avec succès ».
          </p>
        )}
      </AnimateOnView>

      <EventStatsSection />
    </div>
  );
}

/** Conferences & workshops of the last 12 months: attendance and contacts they brought (docs/EVENTS-PLAN.md §3). */
async function EventStatsSection() {
  const st = await getEventStats();
  if (!st.rows.length && !st.contacts) return null;
  return (
    <AnimateOnView className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Événements · 12 derniers mois</h2>
        <Link href="/mes-evenements" className="text-sm text-muted-foreground hover:underline">
          Voir les événements
        </Link>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        {st.registered} inscrit{st.registered > 1 ? "s" : ""} · {st.present} présent{st.present > 1 ? "s" : ""}
        {st.registered ? ` (${Math.round((st.present / st.registered) * 100)} %)` : ""} · {st.contacts} contact{st.contacts > 1 ? "s" : ""} venu
        {st.contacts > 1 ? "s" : ""} d’un événement, dont {st.clients} devenu{st.clients > 1 ? "s" : ""} client{st.clients > 1 ? "s" : ""}
      </p>
      {st.rows.length > 0 && (
        <ul className="grid gap-2">
          {st.rows.map((r) => (
            <li key={r.id} className="flex items-baseline justify-between gap-3 text-sm">
              <Link href={`/mes-evenements/${r.id}`} className="truncate hover:underline">
                {r.title}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {r.present} / {r.registered} présents{r.registered ? ` · ${Math.round((r.present / r.registered) * 100)} %` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </AnimateOnView>
  );
}
