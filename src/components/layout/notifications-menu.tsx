import Link from "next/link";
import { Bell, CalendarClock, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getNotifications } from "@/server/queries/notifications";
import { formatDate, fullName } from "@/lib/format";

const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

export async function NotificationsMenu() {
  const { overdue, today, count } = await getNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${count})`}>
          <Bell />
          {count > 0 && (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {count}
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
    </DropdownMenu>
  );
}
