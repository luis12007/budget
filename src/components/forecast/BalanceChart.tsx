"use client";

import { format } from "date-fns";
import { useState } from "react";
import { fromKey } from "@/lib/dates";
import type { ForecastPoint, Granularity } from "@/lib/forecast";
import { formatCents, formatCompactCents } from "@/lib/money";
import { AXIS_TEXT, niceTicks, useWidth } from "./chart";

const HEIGHT = 300;
const MARGIN = { top: 24, right: 96, bottom: 32, left: 64 };

export function BalanceChart({
  points,
  runsOut,
  granularity,
}: {
  points: ForecastPoint[];
  runsOut: string | null;
  granularity: Granularity;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  let minV = 0;
  let maxV = 0;
  for (const p of points) {
    if (p.balance < minV) minV = p.balance;
    if (p.balance > maxV) maxV = p.balance;
  }
  const ticks = niceTicks(minV, maxV, 5);
  const y0 = ticks[0];
  const y1 = ticks[ticks.length - 1];
  const last = points.length - 1;

  const x = (i: number) => MARGIN.left + (last > 0 ? (i / last) * innerW : 0);
  const y = (v: number) => MARGIN.top + (1 - (v - y0) / (y1 - y0)) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.balance).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${x(last).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;

  const indexed = points.map((p, i) => ({ p, i }));
  const periodStarts = indexed.filter(({ p }) =>
    granularity === "month" ? p.date.endsWith("-01") : p.date.endsWith("-01-01"),
  );
  const useWeekly = granularity === "month" && periodStarts.length < 3;
  const candidates = useWeekly ? indexed.filter(({ i }) => i % 7 === 0) : periodStarts;
  const stride = Math.max(1, Math.ceil(candidates.length / 8));
  const xLabels = candidates.filter((_, k) => k % stride === 0);
  const xLabelFormat = useWeekly ? "d MMM" : granularity === "month" ? (stride > 2 ? "MMM yy" : "MMM") : "yyyy";

  const runsOutIndex = runsOut ? points.findIndex((p) => p.date === runsOut) : -1;
  const hovered = hover !== null ? points[hover] : null;

  const indexFromClientX = (clientX: number, el: Element) => {
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left - MARGIN.left) / innerW;
    return Math.min(last, Math.max(0, Math.round(ratio * last)));
  };

  return (
    <div ref={ref} className="relative w-full select-none">
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Projected balance over time"
          className="block overflow-visible"
          tabIndex={0}
          onMouseMove={(e) => setHover(indexFromClientX(e.clientX, e.currentTarget))}
          onMouseLeave={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setHover((h) => Math.min(last, (h ?? -1) + 1));
            if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? last + 1) - 1));
            if (e.key === "Escape") setHover(null);
          }}
          onBlur={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={MARGIN.left}
                x2={MARGIN.left + innerW}
                y1={y(t)}
                y2={y(t)}
                className={t === 0 ? "stroke-zinc-400 dark:stroke-zinc-500" : "stroke-zinc-200 dark:stroke-zinc-800"}
                strokeWidth={1}
              />
              <text x={MARGIN.left - 8} y={y(t)} dy="0.35em" textAnchor="end" className={AXIS_TEXT}>
                {formatCompactCents(t)}
              </text>
            </g>
          ))}

          {xLabels.map(({ p, i }) => (
            <text
              key={p.date}
              x={x(i)}
              y={HEIGHT - MARGIN.bottom + 18}
              textAnchor="middle"
              className={AXIS_TEXT}
            >
              {format(fromKey(p.date), xLabelFormat)}
            </text>
          ))}

          <path d={areaPath} fill="var(--viz-series-1)" fillOpacity={0.1} />
          <path
            d={linePath}
            fill="none"
            stroke="var(--viz-series-1)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {runsOutIndex >= 0 && (
            <g>
              <line
                x1={x(runsOutIndex)}
                x2={x(runsOutIndex)}
                y1={MARGIN.top}
                y2={MARGIN.top + innerH}
                stroke="var(--viz-critical)"
                strokeWidth={1}
                strokeOpacity={0.5}
              />
              <circle cx={x(runsOutIndex)} cy={y(0)} r={6} fill="var(--viz-surface)" />
              <circle cx={x(runsOutIndex)} cy={y(0)} r={4} fill="var(--viz-critical)" />
              <text
                x={x(runsOutIndex)}
                y={MARGIN.top - 8}
                textAnchor={x(runsOutIndex) > MARGIN.left + innerW * 0.8 ? "end" : "middle"}
                className="fill-zinc-700 text-[11px] font-medium dark:fill-zinc-200"
              >
                Runs out {format(fromKey(points[runsOutIndex].date), "d MMM yyyy")}
              </text>
            </g>
          )}

          <circle cx={x(last)} cy={y(points[last].balance)} r={6} fill="var(--viz-surface)" />
          <circle cx={x(last)} cy={y(points[last].balance)} r={4} fill="var(--viz-series-1)" />
          <text
            x={x(last) + 10}
            y={y(points[last].balance)}
            dy="0.35em"
            className="fill-zinc-700 text-[11px] font-medium tabular-nums dark:fill-zinc-200"
          >
            {formatCents(points[last].balance)}
          </text>

          {hovered && hover !== null && (
            <g pointerEvents="none">
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={MARGIN.top}
                y2={MARGIN.top + innerH}
                className="stroke-zinc-400 dark:stroke-zinc-500"
                strokeWidth={1}
              />
              <circle cx={x(hover)} cy={y(hovered.balance)} r={6} fill="var(--viz-surface)" />
              <circle cx={x(hover)} cy={y(hovered.balance)} r={4} fill="var(--viz-series-1)" />
            </g>
          )}
        </svg>
      )}

      {hovered && hover !== null && width > 0 && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md dark:border-zinc-700 dark:bg-zinc-800"
          style={{
            left: x(hover),
            transform: x(hover) > width * 0.7 ? "translate(calc(-100% - 12px), 0)" : "translate(12px, 0)",
          }}
        >
          <div className="text-zinc-500 dark:text-zinc-400">
            {format(fromKey(hovered.date), "EEE, d MMM yyyy")}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 font-medium tabular-nums">
            <span className="inline-block size-2 rounded-full" style={{ background: "var(--viz-series-1)" }} />
            {formatCents(hovered.balance)}
          </div>
        </div>
      )}
    </div>
  );
}
