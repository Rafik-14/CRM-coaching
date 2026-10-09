import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, Download, Percent, Wallet, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { NewContactButton } from "@/components/new-contact-button";
import { EmptyState } from "@/components/illustrations/empty-state";
import { CONTACTS_PAGE_SIZE, getContactStats, getStages, listContacts } from "@/server/queries/contacts";
import { formatMoney, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ContactFilters } from "./contact-filters";
import { ContactsTable } from "./contacts-table";

export const metadata: Metadata = { title: "Contacts" };

type SP = PageProps<"/contacts">["searchParams"];

export default function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  return (
    <>
      <PageHeader title="Contacts" description="Suivez vos prospects et vos clients">
        <Suspense fallback={<Skeleton className="h-9 w-64" />}>
          <HeaderActions searchParams={searchParams} />
        </Suspense>
      </PageHeader>
      <div className="grid gap-6">
        <Suspense fallback={<Skeleton className="h-[28rem] rounded-2xl" />}>
          <ContactsList searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>}>
          <ContactKpis />
        </Suspense>
      </div>
    </>
  );
}

async function readFilters(searchParams: SP) {
  const p = await searchParams;
  const q = typeof p.q === "string" ? p.q : undefined;
  const stage = typeof p.etape === "string" ? p.etape : undefined;
  const page = Math.max(1, Number(typeof p.page === "string" ? p.page : 1) || 1);
  return { q, stage, page };
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && v !== 1) s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : "";
}

async function HeaderActions({ searchParams }: { searchParams: SP }) {
  const { q, stage } = await readFilters(searchParams);
  return (
    <>
      <Button variant="secondary" asChild>
        {/* Plain link: the browser downloads the CSV file */}
        <a href={`/contacts/export${buildQuery({ q, etape: stage })}`}>
          <Download /> Exporter
        </a>
      </Button>
      <NewContactButton />
    </>
  );
}

async function ContactsList({ searchParams }: { searchParams: SP }) {
  const { q, stage, page } = await readFilters(searchParams);
  const [stages, { rows, total, pageCount, page: current }] = await Promise.all([
    getStages(),
    listContacts({ q, stage, page }),
  ]);
  const from = total === 0 ? 0 : (current - 1) * CONTACTS_PAGE_SIZE + 1;
  const to = Math.min(current * CONTACTS_PAGE_SIZE, total);

  return (
    <div className="grid gap-4">
      <ContactFilters stages={stages} q={q ?? ""} stage={stage ?? ""} />
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <ContactsTable
          rows={rows.map((r) => ({ ...r, lastActivityLabel: r.lastActivity ? formatRelative(r.lastActivity) : null }))}
          empty={
            q || stage ? (
              <EmptyState
                illustration="confused"
                title="Aucun résultat"
                description="Essayez un autre nom, un e-mail ou retirez le filtre d'étape."
                action={
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/contacts">Effacer la recherche</Link>
                  </Button>
                }
              />
            ) : (
              <EmptyState
                illustration="pointing-side"
                title="Ajoutez votre premier contact"
                description="Prospects, clients, recommandations : tout commence ici."
                action={<NewContactButton />}
              />
            )
          }
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            {total === 0 ? "Aucun contact" : `Contacts ${from}–${to} sur ${total}`}
          </p>
          {pageCount > 1 && (
            <nav className="flex items-center gap-1" aria-label="Pagination">
              <PageLink page={current - 1} disabled={current <= 1} q={q} stage={stage} label="Page précédente">
                <ChevronLeft className="size-4" />
              </PageLink>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                <PageLink key={p} page={p} active={p === current} q={q} stage={stage} label={`Page ${p}`}>
                  {p}
                </PageLink>
              ))}
              <PageLink page={current + 1} disabled={current >= pageCount} q={q} stage={stage} label="Page suivante">
                <ChevronRight className="size-4" />
              </PageLink>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

function PageLink({
  page,
  q,
  stage,
  active,
  disabled,
  label,
  children,
}: {
  page: number;
  q?: string;
  stage?: string;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const cls = cn(
    "flex size-8 items-center justify-center rounded-lg text-sm tabular-nums transition-colors",
    active ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
    disabled && "pointer-events-none opacity-40",
  );
  if (disabled) return <span className={cls} aria-hidden>{children}</span>;
  return (
    <Link href={`/contacts${buildQuery({ q, etape: stage, page })}`} className={cls} aria-label={label} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}

async function ContactKpis() {
  const s = await getContactStats();
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        label="Valeur du pipeline"
        value={formatMoney(s.openPipelineValue)}
        icon={Wallet}
        hint={`${s.openCount} prospect${s.openCount > 1 ? "s" : ""} en cours`}
      />
      <StatCard label="Valeur moyenne" value={formatMoney(s.averageValue)} icon={WalletCards} accent="info" hint="par prospect" />
      <StatCard
        label="Taux de conversion"
        value={`${Math.round(s.conversionRate * 100)} %`}
        icon={Percent}
        accent="success"
        hint="contacts devenus clients"
      />
    </div>
  );
}
