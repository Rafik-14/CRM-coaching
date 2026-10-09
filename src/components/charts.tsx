import { cn } from "@/lib/utils";

const weekFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

/** Sessions per week: done (solid) stacked with planned (lighter). */
export function SessionsBarChart({
  weeks,
}: {
  weeks: { start: Date; done: number; planned: number; current: boolean }[];
}) {
  const max = Math.max(1, ...weeks.map((w) => w.done + w.planned));
  return (
    <figure className="grid gap-3">
      <div className="flex h-52 items-end gap-2 sm:gap-3" role="img" aria-label="Séances par semaine sur 8 semaines">
        {weeks.map((w) => {
          const total = w.done + w.planned;
          return (
            <div key={w.start.toISOString()} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-xs font-medium text-muted-foreground tabular-nums opacity-0 transition-opacity group-hover:opacity-100">
                {total}
              </span>
              <div
                className="flex w-full max-w-10 flex-col justify-end overflow-hidden rounded-t-lg"
                style={{ height: `${(total / max) * 100}%`, minHeight: total ? 6 : 2 }}
                title={`${w.done} effectuée(s), ${w.planned} prévue(s)`}
              >
                {w.planned > 0 && <div className="w-full bg-primary/30" style={{ flexGrow: w.planned }} />}
                {w.done > 0 && (
                  <div
                    className={cn("w-full", w.current ? "bg-primary" : "bg-primary/60")}
                    style={{ flexGrow: w.done }}
                  />
                )}
                {total === 0 && <div className="h-0.5 w-full bg-border" />}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 sm:gap-3">
        {weeks.map((w) => (
          <span
            key={w.start.toISOString()}
            className={cn("flex-1 text-center text-[10px] text-muted-foreground", w.current && "font-semibold text-primary")}
          >
            {w.current ? "Cette sem." : weekFmt.format(w.start)}
          </span>
        ))}
      </div>
      <figcaption className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary/70" /> Effectuées
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary/30" /> Prévues
        </span>
      </figcaption>
    </figure>
  );
}

const SLICE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

/** Donut chart (CSS conic-gradient) with legend. */
export function DonutChart({ slices, centerLabel }: { slices: { label: string; value: number }[]; centerLabel: string }) {
  const sum = slices.reduce((n, s) => n + s.value, 0);
  const total = sum || 1;
  // Cumulative end of each slice, in degrees
  const ends = slices.map((_, i) => (slices.slice(0, i + 1).reduce((n, s) => n + s.value, 0) / total) * 360);
  const stops = slices
    .map((_, i) => `${SLICE_COLORS[i % SLICE_COLORS.length]} ${i ? ends[i - 1] : 0}deg ${ends[i]}deg`)
    .join(", ");

  return (
    <div className="grid gap-5">
      <div className="relative mx-auto size-40">
        <div className="size-full rounded-full" style={{ background: `conic-gradient(${stops})` }} aria-hidden />
        <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-card">
          <span className="text-2xl font-bold tabular-nums">{sum}</span>
          <span className="text-[11px] text-muted-foreground uppercase">{centerLabel}</span>
        </div>
      </div>
      <ul className="grid gap-2">
        {slices.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-full" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
            <span className="flex-1 truncate text-muted-foreground">{s.label}</span>
            <span className="font-medium tabular-nums">{Math.round((s.value / total) * 100)} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
