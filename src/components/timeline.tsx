import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";

type Event = {
  id: string;
  at: Date;
  kind: "created" | "session_done" | "session_planned" | "session_cancelled" | "stage" | "closed" | "update";
  title: string;
  description?: string;
  /** Most recent event that already happened (highlighted). */
  latest?: boolean;
};

const dot: Record<Event["kind"], string> = {
  created: "bg-muted-foreground",
  session_done: "bg-success",
  session_planned: "bg-info",
  session_cancelled: "bg-destructive",
  stage: "bg-primary",
  closed: "bg-warning",
  update: "bg-muted-foreground",
};

export function Timeline({ events, className }: { events: Event[]; className?: string }) {
  if (!events.length) return <p className="text-sm text-muted-foreground">Aucune activité pour le moment.</p>;

  return (
    <ol className={cn("relative grid gap-5", className)}>
      {events.map((e, i) => (
        <li key={e.id} className="relative grid grid-cols-[16px_1fr] gap-3">
          {i < events.length - 1 && (
            <span aria-hidden className="absolute top-4 left-[7px] h-[calc(100%+0.5rem)] w-px bg-border" />
          )}
          <span
            aria-hidden
            className={cn(
              "relative mt-1 size-3.5 rounded-full ring-4 ring-background",
              dot[e.kind],
              e.latest && "ring-primary/25",
            )}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{e.title}</span>
              {e.latest && (
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Dernier
                </span>
              )}
            </div>
            {e.description && <p className="mt-0.5 text-sm text-muted-foreground">{e.description}</p>}
            <p className="mt-1 text-xs text-muted-foreground/80 first-letter:uppercase">{formatRelative(e.at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
