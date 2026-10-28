"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type WeekPoint = {
  key: string;
  /** Axis label (« 12 oct. » or « Cette sem. »). */
  label: string;
  /** Tooltip title (« Semaine du 12 octobre »). */
  longLabel: string;
  done: number;
  planned: number;
  current: boolean;
};

const H = 230;
const PAD = { top: 14, right: 8, bottom: 28, left: 28 };

/**
 * Sessions per week: done (navy) stacked under planned (gold), with the weekly average of the finished weeks as a
 * dotted line, and the exact numbers on hover.
 */
export function SessionsChart({ weeks }: { weeks: WeekPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [width, setWidth] = useState(560);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const past = weeks.filter((w) => !w.current);
  const average = past.length ? past.reduce((n, w) => n + w.done, 0) / past.length : 0;
  const max = Math.max(4, ...weeks.map((w) => w.done + w.planned), Math.ceil(average));
  const top = max <= 4 ? 4 : Math.ceil(max / 2) * 2;
  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / weeks.length;
  const barW = Math.min(28, slot * 0.55);
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
  const ticks = [0, top / 2, top];
  const h = hover != null ? weeks[hover] : null;
  const avgLabel = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(average);

  return (
    <figure className="grid min-w-0 gap-3">
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-[2px] bg-[var(--chart-1)]" /> Effectuées
        </li>
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-[2px] bg-[var(--chart-2)]" /> Prévues
        </li>
        <li className="flex items-center gap-2">
          <svg width="18" height="8" aria-hidden>
            <line x1="1" y1="4" x2="17" y2="4" stroke="var(--muted-foreground)" strokeDasharray="3 3" />
          </svg>
          Moyenne : <span className="font-semibold text-foreground tabular-nums">{avgLabel}</span> par semaine
        </li>
      </ul>

      <div ref={box} className="relative">
        <svg
          viewBox={`0 0 ${width} ${H}`}
          height={H}
          role="img"
          aria-label={`Séances par semaine sur ${weeks.length} semaines, moyenne ${avgLabel} séances effectuées par semaine.`}
          className="block w-full"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                {t}
              </text>
            </g>
          ))}
          {weeks.map((w, i) => {
            const cx = PAD.left + slot * i + slot / 2;
            const doneTop = y(w.done);
            const plannedTop = y(w.done + w.planned);
            return (
              <g
                key={w.key}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                className={cn("transition-opacity", hover != null && hover !== i && "opacity-50")}
              >
                {/* Hit area wider than the bar. */}
                <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={innerH} fill="transparent" />
                {w.done > 0 && (
                  <rect
                    x={cx - barW / 2}
                    y={doneTop}
                    width={barW}
                    height={y(0) - doneTop}
                    rx={w.planned ? 0 : 4}
                    fill="var(--chart-1)"
                  />
                )}
                {w.planned > 0 && (
                  <rect
                    x={cx - barW / 2}
                    y={plannedTop}
                    width={barW}
                    height={Math.max(0, doneTop - plannedTop - (w.done ? 2 : 0))}
                    rx={4}
                    fill="var(--chart-2)"
                  />
                )}
                <text
                  x={cx}
                  y={H - 8}
                  textAnchor="middle"
                  className={cn("fill-muted-foreground text-[11px]", w.current && "fill-foreground font-semibold")}
                >
                  {w.label}
                </text>
              </g>
            );
          })}
          {average > 0 && (
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(average)}
              y2={y(average)}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              pointerEvents="none"
            />
          )}
        </svg>

        {h && hover != null && (
          <div
            className="pointer-events-none absolute top-0 z-20 w-48 rounded-lg border border-border bg-popover p-3 text-xs shadow-md"
            style={
              PAD.left + slot * hover + slot / 2 > width / 2
                ? { right: width - (PAD.left + slot * hover) + 6 }
                : { left: PAD.left + slot * (hover + 1) + 6 }
            }
          >
            <p className="font-semibold text-foreground">{h.longLabel}</p>
            <p className="mt-1.5 flex justify-between text-muted-foreground">
              Effectuées <span className="font-semibold text-foreground tabular-nums">{h.done}</span>
            </p>
            <p className="flex justify-between text-muted-foreground">
              Prévues <span className="font-semibold text-foreground tabular-nums">{h.planned}</span>
            </p>
          </div>
        )}
      </div>
    </figure>
  );
}
