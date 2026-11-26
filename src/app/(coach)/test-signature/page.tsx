import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarCheck2, ClipboardCheck, PhoneCall, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { requireCoach } from "@/server/dal";
import { alerts, completedSessions, configurationDistribution, counters, openCallbacks, searchParticipants, upcomingCalls } from "@/server/revelateur/crm";
import { CallbackActions } from "./crm-actions";
import { CALLBACK_LABEL, configText, DELIVERY_LABEL, fmtDate, periodStart, PERIODS } from "./labels";

export const metadata: Metadata = { title: "Le Révélateur" };

type SP = PageProps<"/test-signature">["searchParams"];

/**
 * The test's CRM (annexe 07): the three counters first, each opening its list; the configuration
 * distribution; admin alerts; one search box (first name or e-mail).
 */
export default function RevelateurCrmPage({ searchParams }: PageProps<"/test-signature">) {
  return (
    <>
      <PageHeader title="Le Révélateur" description="Test Signature JG® : tests réalisés, rappels à effectuer, appels découverte" />
      <Suspense fallback={<Skeleton className="h-[32rem] rounded-2xl" />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Dashboard({ searchParams }: { searchParams: SP }) {
  await requireCoach();
  const p = await searchParams;
  const periodKey = typeof p.periode === "string" ? p.periode : "tout";
  const period = PERIODS.find((x) => x.key === periodKey) ?? PERIODS[0];
  const from = periodStart(period.days);
  const vue = typeof p.vue === "string" ? p.vue : null;
  const q = typeof p.q === "string" ? p.q : "";
  const link = (extra: Record<string, string>) => `?${new URLSearchParams({ ...(period.key !== "tout" ? { periode: period.key } : {}), ...extra })}`;

  const [c, dist, alertList] = await Promise.all([counters(db, { from }), configurationDistribution(db, from), alerts(db)]);
  const total = dist.reduce((n, d) => n + d.n, 0);

  return (
    <div className="grid gap-6">
      {/* The three priority counters (annexe 07 §1.1), clickable */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href={link({ vue: "tests" })} className="rounded-xl ring-primary focus-visible:ring-2">
          <StatCard label="Tests réalisés" value={c.tests} icon={ClipboardCheck} detail="Sessions terminées (pas des personnes uniques)" />
        </Link>
        <Link href={link({ vue: "rappels" })} className="rounded-xl ring-primary focus-visible:ring-2">
          <StatCard label="Rappels à effectuer" value={c.callbacks} icon={PhoneCall} accent="warning" detail="Demandes explicites en attente" />
        </Link>
        <Link href={link({ vue: "rdv" })} className="rounded-xl ring-primary focus-visible:ring-2">
          <StatCard label="Appels découverte réservés" value={c.calls} icon={CalendarCheck2} accent="success" detail="Rendez-vous confirmés à venir" />
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Période" className="flex flex-wrap gap-1.5 text-sm">
          {PERIODS.map((x) => (
            <Link
              key={x.key}
              href={`?${new URLSearchParams({ ...(x.key !== "tout" ? { periode: x.key } : {}), ...(vue ? { vue } : {}) })}`}
              className={cn("rounded-md border px-2.5 py-1", x.key === period.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
            >
              {x.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Exporter :</span>
          <a href={`/test-signature/export?format=xlsx${period.key !== "tout" ? `&periode=${period.key}` : ""}`} className="rounded-md border border-border px-2.5 py-1 hover:border-primary">
            XLSX
          </a>
          <a href={`/test-signature/export?format=pdf${period.key !== "tout" ? `&periode=${period.key}` : ""}`} className="rounded-md border border-border px-2.5 py-1 hover:border-primary">
            PDF
          </a>
        </div>
        <form className="flex items-center gap-2" action="">
          {period.key !== "tout" && <input type="hidden" name="periode" value={period.key} />}
          <Input name="q" defaultValue={q} placeholder="Prénom ou adresse e-mail" className="h-9 w-64" aria-label="Rechercher un participant" />
          <Button type="submit" size="sm" variant="outline">
            <Search className="size-4" /> Rechercher
          </Button>
        </form>
      </div>

      {/* Admin alerts: red = blocking, orange = to handle, green = normal (never e-mailed) */}
      <ul className="grid gap-2">
        {alertList.map((a, i) => (
          <li
            key={i}
            className={cn(
              "rounded-lg border px-4 py-2.5 text-sm",
              a.level === "red" && "border-destructive/40 bg-destructive/10 text-destructive",
              a.level === "orange" && "border-warning/40 bg-warning/10",
              a.level === "green" && "border-success/30 bg-success/5 text-muted-foreground",
            )}
          >
            {a.href ? <Link href={link({ vue: a.href.replace("?vue=", "") })}>{a.text}</Link> : a.text}
          </li>
        ))}
      </ul>

      {q ? <SearchResults q={q} /> : vue === "rappels" ? <Callbacks from={from} /> : vue === "rdv" ? <Calls from={from} /> : <Tests from={from} />}

      {/* Configuration distribution (§3.2 / §13): five exclusive categories */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Répartition des configurations · {period.label.toLowerCase()}</h2>
        <ul className="mt-4 grid gap-2.5">
          {dist.map((d) => (
            <li key={d.code} className="grid grid-cols-[13rem_1fr_3rem] items-center gap-3 text-sm">
              <span>{d.label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${total ? (d.n / total) * 100 : 0}%` }} />
              </span>
              <span className="text-right tabular-nums">{d.n}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Panel({ title, children, empty }: { title: string; children: React.ReactNode; empty: boolean }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <h2 className="border-b border-border px-5 py-3 text-sm font-semibold">{title}</h2>
      {empty ? <p className="px-5 py-6 text-sm text-muted-foreground">Rien pour le moment.</p> : <div className="overflow-x-auto">{children}</div>}
    </section>
  );
}
const th = "px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase";
const td = "px-4 py-2.5 align-top";

async function Tests({ from }: { from?: Date }) {
  const rows = await completedSessions(db, { from });
  return (
    <Panel title="Tests réalisés · du plus récent au plus ancien" empty={!rows.length}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className={th}>Date</th>
            <th className={th}>Participant</th>
            <th className={th}>Configuration</th>
            <th className={th}>Rapport</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
              <td className={td}>
                <Link href={`/test-signature/sessions/${r.id}`} className="hover:underline">
                  {fmtDate(r.confirmedAt)}
                </Link>
              </td>
              <td className={td}>
                {r.participantId ? (
                  <Link href={`/test-signature/participants/${r.participantId}`} className="hover:underline">
                    {r.firstName || "—"} <span className="text-muted-foreground">· {r.email}</span>
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Adresse pas encore donnée</span>
                )}
              </td>
              <td className={td}>{configText(r.configuration, r.profile)}</td>
              <td className={td}>{r.delivery ? DELIVERY_LABEL[r.delivery] : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

async function Callbacks({ from }: { from?: Date }) {
  const rows = await openCallbacks(db, from);
  return (
    <Panel title="Rappels à effectuer · les plus anciens d'abord" empty={!rows.length}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className={th}>Demandé le</th>
            <th className={th}>Participant</th>
            <th className={th}>Téléphone</th>
            <th className={th}>Statut</th>
            <th className={th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60 last:border-0">
              <td className={td}>{fmtDate(r.requestedAt)}</td>
              <td className={td}>
                <Link href={`/test-signature/participants/${r.participantId}`} className="hover:underline">
                  {r.firstName || "—"} <span className="text-muted-foreground">· {r.email}</span>
                </Link>
              </td>
              <td className={cn(td, "whitespace-nowrap")}>
                <a href={`tel:${r.phone}`} className="hover:underline">
                  {r.phone}
                </a>
              </td>
              <td className={td}>{CALLBACK_LABEL[r.status]}</td>
              <td className={td}>
                <CallbackActions id={r.id} status={r.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

async function Calls({ from }: { from?: Date }) {
  const rows = await upcomingCalls(db, { from });
  return (
    <Panel title="Appels découverte réservés · à venir" empty={!rows.length}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className={th}>Date et heure (Paris)</th>
            <th className={th}>Participant</th>
            <th className={th}>Fiche client</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60 last:border-0">
              <td className={td}>{fmtDate(r.startsAt)}</td>
              <td className={td}>
                <Link href={`/test-signature/participants/${r.participantId}`} className="hover:underline">
                  {r.firstName} <span className="text-muted-foreground">· {r.email}</span>
                </Link>
              </td>
              <td className={td}>
                <Link href={`/contacts/${r.contactId}`} className="text-primary hover:underline">
                  Ouvrir
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

async function SearchResults({ q }: { q: string }) {
  const rows = await searchParticipants(db, q);
  return (
    <Panel title={`Résultats pour « ${q} »`} empty={!rows.length}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className={th}>Prénom</th>
            <th className={th}>Adresse e-mail</th>
            <th className={th}>Tests</th>
            <th className={th}>Dernière activité</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
              <td className={td}>
                <Link href={`/test-signature/participants/${r.id}`} className="hover:underline">
                  {r.firstName || "—"}
                </Link>
              </td>
              <td className={td}>{r.email}</td>
              <td className={td}>{r.sessions}</td>
              <td className={td}>{fmtDate(r.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
