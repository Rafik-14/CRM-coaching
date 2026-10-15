import Link from "next/link";
import { Bell, CalendarClock, CalendarX, CircleAlert, Globe, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getNotifications } from "@/server/queries/notifications";
import { APP_TIME_ZONE, formatDate, formatDayTime, fullName } from "@/lib/format";
import { NotificationsDropdown } from "./notifications-dropdown";

const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: APP_TIME_ZONE });

export async function NotificationsMenu() {
  const { overdue, today, keyMoments, online, count } = await getNotifications();

  return (
    <NotificationsDropdown hasOnline={online.length > 0}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${count})`}>
          <Bell />
          {count > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {count === 0 && (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">Tout est à jour.</p>
        )}
        {online.map((e) => (
          <DropdownMenuItem key={e.id} asChild>
            <Link href={`/contacts/${e.contact.id}?onglet=seances`} className="items-start gap-3">
              {e.action === "booking_cancelled_online" ? (
                <CalendarX className="mt-0.5 text-destructive" />
              ) : (
                <Globe className="mt-0.5 text-info" />
              )}
              <span className="grid">
                <span className="text-sm">
                  {e.label} · {fullName(e.contact)}
                </span>
                <span className="text-xs text-muted-foreground first-letter:uppercase">{formatDayTime(e.createdAt)}</span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
        {today.map((s) => (
          <DropdownMenuItem key={s.id} asChild>
            <Link href={`/contacts/${s.contact.id}`} className="items-start gap-3">
              <CalendarClock className="mt-0.5 text-info" />
              <span className="grid">
                <span className="text-sm">{s.type} · {fullName(s.contact)}</span>
                <span className="text-xs text-muted-foreground">Aujourd&apos;hui à {timeFmt.format(s.startsAt)}</span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
        {keyMoments.map((c) => (
          <DropdownMenuItem key={c.id} asChild>
            <Link href={`/contacts/${c.id}`} className="items-start gap-3">
              <Target className="mt-0.5 text-heading" />
              <span className="grid">
                <span className="text-sm">
                  {c.stake ?? "Moment décisif"} · {fullName(c)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {c.inDays <= 0 ? "Aujourd'hui" : c.inDays === 1 ? "Demain" : `Dans ${c.inDays} jours`} · {formatDate(c.keyMomentAt)}
                </span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
        {overdue.map((t) => (
          <DropdownMenuItem key={t.id} asChild>
            <Link href="/taches" className="items-start gap-3">
              <CircleAlert className="mt-0.5 text-destructive" />
              <span className="grid">
                <span className="text-sm">{t.title}</span>
                <span className="text-xs text-muted-foreground">En retard · {formatDate(t.dueAt)}</span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </NotificationsDropdown>
  );
}
