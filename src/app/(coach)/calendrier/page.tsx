import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { getCalendarSessions, type CalendarSession } from "@/server/queries/calendar";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Calendrier" };

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

const chip: Record<CalendarSession["status"], string> = {
  planned: "bg-primary/12 text-primary hover:bg-primary/20",
  done: "bg-success/12 text-success hover:bg-success/20",
  cancelled: "bg-muted text-muted-foreground line-through",
  no_show: "bg-destructive/10 text-destructive",
};

export default function CalendarPage({ searchParams }: PageProps<"/calendrier">) {
  return (
    <>
      <PageHeader title="Calendrier" description="Toutes vos séances et appels découverte" />
      <Suspense fallback={<Skeleton className="h-[36rem] rounded-2xl" />}>
        <Calendar searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const monthParam = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

async function Calendar({ searchParams }: { searchParams: PageProps<"/calendrier">["searchParams"] }) {
  const sp = await searchParams;
  await connection(); // "today" is request-time data
  const now = new Date();
  const m = typeof sp.mois === "string" && /^\d{4}-\d{2}$/.test(sp.mois) ? sp.mois.split("-").map(Number) : null;
  const month = m ? new Date(m[0], m[1] - 1, 1) : new Date(now.getFullYear(), now.getMonth(), 1);

  // 6 weeks grid starting on the Monday on/before the 1st
  const gridStart = new Date(month);
  gridStart.setDate(1 - ((month.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  const gridEnd = new Date(days[41].getFullYear(), days[41].getMonth(), days[41].getDate() + 1);

  const sessions = await getCalendarSessions(gridStart, gridEnd);
  const byDay = new Map<string, CalendarSession[]>();
  for (const s of sessions) byDay.set(key(s.startsAt), [...(byDay.get(key(s.startsAt)) ?? []), s]);

  const prev = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const todayKey = key(now);
  const inMonth = sessions.filter((s) => s.startsAt.getMonth() === month.getMonth());
  const monthDays = days.filter((d) => d.getMonth() === month.getMonth() && byDay.has(key(d)));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold first-letter:uppercase">{monthFmt.format(month)}</h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/calendrier?mois=${monthParam(prev)}`} aria-label="Mois précédent">
              <ChevronLeft />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/calendrier">Aujourd&apos;hui</Link>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/calendrier?mois=${monthParam(next)}`} aria-label="Mois suivant">
              <ChevronRight />
            </Link>
          </Button>
        </div>
      </div>

      {/* Month grid (tablet / desktop) */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-3 py-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const list = byDay.get(key(d)) ?? [];
            const other = d.getMonth() !== month.getMonth();
            return (
              <div
                key={i}
                className={cn(
                  "min-h-28 border-border p-1.5",
                  i % 7 !== 6 && "border-r",
                  i < 35 && "border-b",
                  other && "bg-muted/30",
                )}
              >
                <div
                  className={cn(
                    "mb-1 flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                    other ? "text-muted-foreground/60" : "text-muted-foreground",
                    key(d) === todayKey && "bg-primary font-semibold text-primary-foreground",
                  )}
                >
                  {d.getDate()}
                </div>
                <div className="grid gap-1">
                  {list.slice(0, 3).map((s) => (
                    <Link
                      key={s.id}
                      href={`/contacts/${s.contact.id}?onglet=seances`}
                      className={cn("truncate rounded-md px-1.5 py-0.5 text-[11px] transition-colors", chip[s.status])}
                      title={`${timeFmt.format(s.startsAt)} · ${s.contact.firstName} ${s.contact.lastName} · ${s.type}`}
                    >
                      <span className="font-medium tabular-nums">{timeFmt.format(s.startsAt)}</span> {s.contact.firstName}
                      {s.type === "Appel découverte" && " · découverte"}
                    </Link>
                  ))}
                  {list.length > 3 && <span className="px-1.5 text-[11px] text-muted-foreground">+{list.length - 3} autres</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda list (phones) */}
      <div className="grid gap-3 md:hidden">
        {monthDays.length === 0 && (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Aucune séance ce mois-ci.</p>
        )}
        {monthDays.map((d) => (
          <section key={key(d)} className="rounded-2xl border border-border bg-card p-4">
            <h3 className={cn("mb-2 text-sm font-semibold first-letter:uppercase", key(d) === todayKey && "text-primary")}>
              {dayFmt.format(d)}
            </h3>
            <ul className="grid gap-1.5">
              {byDay.get(key(d))!.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/contacts/${s.contact.id}?onglet=seances`}
                    className={cn("flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm", chip[s.status])}
                  >
                    <span className="font-medium tabular-nums">{timeFmt.format(s.startsAt)}</span>
                    <span className="truncate">
                      {s.contact.firstName} {s.contact.lastName} · {s.type}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span>{inMonth.length} rendez-vous ce mois-ci</span>
        <Legend className="bg-primary/40" label="Prévue" />
        <Legend className="bg-success/50" label="Effectuée" />
        <Legend className="bg-destructive/40" label="Absent" />
        <Legend className="bg-muted-foreground/40" label="Annulée" />
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-sm", className)} />
      {label}
    </span>
  );
}
