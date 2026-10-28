"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type ActivityPoint = {
  key: string;
  /** Short month (« oct. »), axis label. */
  label: string;
  /** Long month (« octobre 2026 »), tooltip title. */
  longLabel: string;
  contacts: number;
  calls: number;
  clients: number;
};

/**
 * Brand colours (navy, gold, teal) are close in lightness, so each series also has its own pattern:
 * contacts = filled area, calls = dashed line, clients = thick solid line. Legend + hover values carry the numbers.
 */
const SERIES = [
  { id: "contacts", label: "Nouveaux contacts", color: "var(--chart-3)", dash: undefined, width: 2, area: true },
  { id: "calls", label: "Échanges stratégiques", color: "var(--chart-2)", dash: "6 4", width: 2.5, area: false },
  { id: "clients", label: "Nouveaux clients", color: "var(--chart-1)", dash: undefined, width: 3, area: false },
] as const;

const H = 280;
const PAD = { top: 16, right: 16, bottom: 30, left: 34 };

/** Rounds the axis maximum up to a readable value (5, 10, 20, 25, 50…). */
function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= v / 4)! * pow;
  return Math.ceil(v / step) * step;
}

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : "—");

/** Big 12-month chart of the dashboard: contacts → strategy calls → new clients, with a 6/12-month switch. */
export function ActivityChart({ months }: { months: ActivityPoint[] }) {
  const [range, setRange] = useState<6 | 12>(12);
  const [hover, setHover] = useState<number | null>(null);
  const [width, setWidth] = useState(720);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = months.slice(-range);
  const totals = {
    contacts: data.reduce((n, m) => n + m.contacts, 0),
    calls: data.reduce((n, m) => n + m.calls, 0),
    clients: data.reduce((n, m) => n + m.clients, 0),
  };
  const empty = totals.contacts + totals.calls + totals.clients === 0;

  const max = niceMax(Math.max(1, ...data.flatMap((m) => [m.contacts, m.calls, m.clients])));
  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(t * max));
  const line = (key: "contacts" | "calls" | "clients") => data.map((m, i) => `${i ? "L" : "M"}${x(i)},${y(m[key])}`).join(" ");

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - rect.left) / rect.width) * innerW;
    setHover(Math.max(0, Math.min(data.length - 1, Math.round((rel / innerW) * (data.length - 1)))));
  };
  const h = hover != null ? data[hover] : null;

  return (
    <figure className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
          {SERIES.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              <svg width="22" height="10" aria-hidden className="shrink-0">
                <line x1="1" y1="5" x2="21" y2="5" stroke={s.color} strokeWidth={s.width} strokeDasharray={s.dash} strokeLinecap="round" />
              </svg>
              <span>
                {s.label} · <span className="font-semibold text-foreground tabular-nums">{totals[s.id]}</span>
              </span>
            </li>
          ))}
          <li className="text-muted-foreground">
            Échange → client : <span className="font-semibold text-foreground tabular-nums">{pct(totals.clients, totals.calls)}</span>
          </li>
        </ul>
        <div role="group" aria-label="Période" className="flex rounded-lg border border-border p-0.5 text-xs">
          {([6, 12] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => {
                setRange(r);
                setHover(null);
              }}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors",
                range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r} mois
            </button>
          ))}
        </div>
      </div>

      <div ref={box} className="relative">
        {empty && (
          <p className="absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground">
            Pas encore d’activité sur cette période.
          </p>
        )}
        <svg
          viewBox={`0 0 ${width} ${H}`}
          height={H}
          role="img"
          aria-label={`Activité sur ${range} mois : ${totals.contacts} nouveaux contacts, ${totals.calls} échanges stratégiques, ${totals.clients} nouveaux clients.`}
          className="block w-full overflow-visible"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                {t}
              </text>
            </g>
          ))}
          {data.map((m, i) => (
            <text
              key={m.key}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              className={cn("fill-muted-foreground text-[11px]", hover === i && "fill-foreground font-semibold")}
            >
              {m.label}
            </text>
          ))}

          <path
            d={`${line("contacts")} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`}
            fill="var(--chart-3)"
            fillOpacity={0.1}
          />
          {SERIES.map((s) => (
            <path
              key={s.id}
              d={line(s.id)}
              fill="none"
              stroke={s.color}
              strokeWidth={s.width}
              strokeDasharray={s.dash}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {h && hover != null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
              {SERIES.map((s) => (
                <circle key={s.id} cx={x(hover)} cy={y(h[s.id])} r={4.5} fill={s.color} stroke="var(--card)" strokeWidth={2} />
              ))}
            </g>
          )}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={innerW}
            height={innerH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>

        {h && hover != null && (
          <div
            className="pointer-events-none absolute top-2 z-20 w-56 rounded-lg border border-border bg-popover p-3 text-xs shadow-md"
            style={x(hover) > width / 2 ? { right: width - x(hover) + 12 } : { left: x(hover) + 12 }}
          >
            <p className="font-semibold text-foreground capitalize">{h.longLabel}</p>
            <ul className="mt-2 grid gap-1">
              {SERIES.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span className="size-2 rounded-[2px]" style={{ background: s.color }} />
                  <span className="flex-1 text-muted-foreground">{s.label}</span>
                  <span className="font-semibold text-foreground tabular-nums">{h[s.id]}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 border-t border-border pt-2 text-muted-foreground">
              Échange → client : <span className="font-semibold text-foreground">{pct(h.clients, h.calls)}</span>
            </p>
          </div>
        )}
      </div>

      {/* Data table for screen readers (wrapped: a table cannot shrink to the 1 px of sr-only). */}
      <div className="sr-only">
      <table>
        <caption>Activité par mois</caption>
        <thead>
          <tr>
            <th>Mois</th>
            {SERIES.map((s) => (
              <th key={s.id}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((m) => (
            <tr key={m.key}>
              <td>{m.longLabel}</td>
              <td>{m.contacts}</td>
              <td>{m.calls}</td>
              <td>{m.clients}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
}
