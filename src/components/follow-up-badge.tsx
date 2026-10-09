import { cn } from "@/lib/utils";

/** Follow-up status from the next open task: overdue / due soon (≤ 2 days) / on track. */
export function followUpStatus(nextDue: Date | null) {
  if (!nextDue) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (nextDue < startOfToday) return "overdue" as const;
  if (nextDue.getTime() - startOfToday.getTime() <= 2 * 86_400_000) return "soon" as const;
  return "ok" as const;
}

const styles = {
  overdue: { label: "En retard", cls: "text-destructive", dot: "bg-destructive" },
  soon: { label: "Bientôt", cls: "text-info", dot: "bg-info" },
  ok: { label: "À jour", cls: "text-success", dot: "bg-success" },
} as const;

export function FollowUpBadge({ nextDue }: { nextDue: Date | null }) {
  const status = followUpStatus(nextDue);
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const s = styles[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase", s.cls)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}
