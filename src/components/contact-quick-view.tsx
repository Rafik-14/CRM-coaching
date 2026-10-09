"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, AtSign, CalendarClock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { StageBadge } from "@/components/stage-badge";
import { Timeline } from "@/components/timeline";
import { getContactPreview, type ContactPreview } from "@/server/actions/preview";
import { daysSince, formatDayTime, formatMoney, fullName, initials } from "@/lib/format";

/** Slide-over with a contact's key info and timeline. Pass `contactId = null` to close. */
export function ContactQuickView({
  contactId,
  onClose,
}: {
  contactId: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<{ id: string; preview: ContactPreview | null } | null>(null);

  useEffect(() => {
    if (!contactId) return;
    let cancelled = false;
    getContactPreview(contactId).then((preview) => {
      if (!cancelled) setData({ id: contactId, preview });
    });
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  const preview = data?.id === contactId ? data.preview : undefined;

  return (
    <Sheet open={!!contactId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {preview === undefined ? (
          <div className="grid gap-4 p-6">
            <SheetTitle className="sr-only">Chargement</SheetTitle>
            <Skeleton className="h-14 w-2/3" />
            <Skeleton className="h-20" />
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
          </div>
        ) : preview === null ? (
          <div className="p-6">
            <SheetTitle>Contact introuvable</SheetTitle>
          </div>
        ) : (
          <QuickViewBody c={preview} />
        )}
      </SheetContent>
    </Sheet>
  );
}

const statusLabel = { active: "Actif", paused: "En pause", finished: "Terminé", stopped: "Arrêté" } as const;

function QuickViewBody({ c }: { c: ContactPreview }) {
  const days = daysSince(c.stageChangedAt);
  const pct = c.package ? Math.round((c.package.used / c.package.total) * 100) : 0;

  return (
    <>
      <SheetHeader className="flex-row items-center gap-3 border-b border-border p-6 pr-12">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-info/90 text-lg font-bold text-background">
          {initials(fullName(c))}
        </span>
        <div className="min-w-0">
          <SheetTitle className="truncate text-xl">{fullName(c)}</SheetTitle>
          <SheetDescription className="text-xs font-semibold tracking-wider text-info uppercase">
            {c.client ? `Client · ${statusLabel[c.client.status]}` : (c.source ?? "Prospect")}
          </SheetDescription>
        </div>
      </SheetHeader>

      <div className="grid flex-1 content-start gap-6 overflow-y-auto p-6">
        <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
          <StageBadge name={c.stage?.name ?? null} color={c.stage?.color ?? null} />
          <span className="text-xs text-muted-foreground">
            {days === 0 ? "Depuis aujourd'hui" : `Depuis ${days} jour${days > 1 ? "s" : ""}`}
          </span>
        </div>

        <section className="grid gap-2">
          <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Coordonnées</h3>
          <InfoRow icon={AtSign} label="E-mail" value={c.email} href={c.email ? `mailto:${c.email}` : undefined} />
          <InfoRow icon={Phone} label="Téléphone" value={c.phone} href={c.phone ? `tel:${c.phone}` : undefined} />
        </section>

        <section className="grid gap-4 rounded-xl border border-border bg-gradient-to-br from-primary/10 to-transparent p-4">
          <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Suivi</h3>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase">Prochaine séance</p>
              <p className="text-base font-semibold first-letter:uppercase">
                {c.nextSession ? formatDayTime(c.nextSession.startsAt) : "—"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground uppercase">Valeur</p>
              <p className="text-2xl font-bold text-primary">
                {c.package
                  ? formatMoney(c.package.price)
                  : c.estimatedValue
                    ? formatMoney(c.estimatedValue)
                    : "—"}
              </p>
            </div>
          </div>
          {c.package && (
            <div className="grid gap-1.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-background/60">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">
                {c.package.name} · {c.package.used}/{c.package.total} séances
              </p>
            </div>
          )}
        </section>

        <section className="grid gap-3">
          <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Historique</h3>
          <Timeline events={c.timeline} />
        </section>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border p-4">
        <Button variant="outline" asChild>
          <Link href={`/contacts/${c.id}?onglet=seances`}>
            <CalendarClock /> Séances
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/contacts/${c.id}`}>
            Ouvrir la fiche <ArrowUpRight />
          </Link>
        </Button>
      </div>
    </>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  href?: string;
}) {
  const body = (
    <>
      <span className="flex size-9 items-center justify-center rounded-lg bg-background">
        <Icon className="size-4 text-muted-foreground" />
      </span>
      <span className="grid min-w-0">
        <span className="text-[11px] text-muted-foreground uppercase">{label}</span>
        <span className="truncate text-sm">{value ?? "—"}</span>
      </span>
    </>
  );
  const cls = "flex items-center gap-3 rounded-xl bg-muted/60 p-3";
  return href ? (
    <a href={href} className={`${cls} hover:bg-muted`}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}
