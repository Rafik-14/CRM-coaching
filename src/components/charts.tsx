import { AnimateOnView, CountUp } from "@/components/animate";

const SLICE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

/** Donut chart (CSS conic-gradient) with a legend giving each slice's count and share. */
export function DonutChart({ slices, centerLabel }: { slices: { label: string; value: number }[]; centerLabel: string }) {
  const sum = slices.reduce((n, s) => n + s.value, 0);
  const total = sum || 1;
  // Cumulative end of each slice, in degrees
  const ends = slices.map((_, i) => (slices.slice(0, i + 1).reduce((n, s) => n + s.value, 0) / total) * 360);
  const stops = slices
    .map((_, i) => `${SLICE_COLORS[i % SLICE_COLORS.length]} ${i ? ends[i - 1] : 0}deg ${ends[i]}deg`)
    .join(", ");

  return (
    <AnimateOnView className="grid gap-5">
      <div className="relative mx-auto size-40">
        <div className="animate-reveal size-full rounded-full" style={{ background: `conic-gradient(${stops})` }} aria-hidden />
        <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-card">
          <CountUp value={String(sum)} className="font-heading text-2xl font-semibold text-heading tabular-nums" />
          <span className="text-[11px] text-muted-foreground uppercase">{centerLabel}</span>
        </div>
      </div>
      <ul className="grid gap-2">
        {slices.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2 text-sm" title={`${s.label} : ${s.value} (${Math.round((s.value / total) * 100)} %)`}>
            <span className="size-2.5 rounded-full" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
            <span className="flex-1 truncate text-muted-foreground">{s.label}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{s.value}</span>
            <CountUp value={`${Math.round((s.value / total) * 100)} %`} className="w-11 text-right font-medium tabular-nums" />
          </li>
        ))}
      </ul>
    </AnimateOnView>
  );
}
