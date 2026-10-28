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
  spark,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  /** Relative change vs previous period, e.g. 0.12 = +12 %. */
  trend?: number | null;
  hint?: string;
  accent?: "primary" | "info" | "success" | "warning";
  /** Small trend curve under the figure (oldest value first), with what it covers (« 6 derniers mois »). */
  spark?: { values: number[]; label: string };
  /** One line explaining what is counted. */
  detail?: string;
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
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      {spark && spark.values.length > 1 && <Sparkline values={spark.values} label={spark.label} className={sparkCls[accent]} />}
    </div>
  );
}

const sparkCls = {
  primary: "text-[var(--chart-1)]",
  info: "text-[var(--chart-3)]",
  success: "text-success",
  warning: "text-[var(--chart-2)]",
} as const;

/** Tiny line chart: the shape of the trend, the last point marked. Values are read from the card itself. */
function Sparkline({ values, label, className }: { values: number[]; label: string; className?: string }) {
  const w = 120;
  const h = 28;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (w - 4) + 2, h - 3 - (v / max) * (h - 6)] as const);
  const [lx, ly] = pts[pts.length - 1];
  return (
    <div className={cn("mt-3 flex items-end justify-between gap-3", className)}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-full max-w-36" aria-hidden>
        <polyline
          points={pts.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={lx} cy={ly} r={3} fill="currentColor" />
      </svg>
      <span className="shrink-0 text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
