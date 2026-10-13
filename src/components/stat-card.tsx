import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/animate";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  hint,
  accent = "primary",
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  /** Relative change vs previous period, e.g. 0.12 = +12 %. */
  trend?: number | null;
  hint?: string;
  accent?: "primary" | "info" | "success" | "warning";
}) {
  const accentCls = {
    primary: "bg-primary/15 text-primary",
    info: "bg-info/15 text-info",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
  }[accent];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</p>
        <span className={cn("flex size-8 items-center justify-center rounded-lg", accentCls)}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 font-heading text-3xl font-semibold tracking-tight text-heading tabular-nums">
        {typeof value === "string" || typeof value === "number" ? <CountUp value={String(value)} /> : value}
      </p>
      {(trend != null || hint) && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          {trend != null && (
            <span className={cn("inline-flex items-center gap-1 font-medium", trend >= 0 ? "text-success" : "text-destructive")}>
              {trend >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              <CountUp value={`${trend >= 0 ? "+" : "−"}${Math.abs(Math.round(trend * 100))} %`} />
            </span>
          )}
          {hint}
        </p>
      )}
    </div>
  );
}
