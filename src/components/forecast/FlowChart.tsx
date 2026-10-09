"use client";

import { useState } from "react";
import type { FlowBucket } from "@/lib/forecast";
import { formatCents, formatCompactCents } from "@/lib/money";
import { AXIS_TEXT, niceTicks, roundedTopBar, useWidth } from "./chart";

const HEIGHT = 260;
const MARGIN = { top: 16, right: 16, bottom: 32, left: 64 };
const MAX_BAR = 24;
const GAP = 2;

export function FlowChart({ buckets }: { buckets: FlowBucket[] }) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  let maxV = 0;
  for (const b of buckets) maxV = Math.max(maxV, b.incomeCents, b.expenseCents);
  const ticks = niceTicks(0, Math.max(maxV, 1), 4);
  const y1 = ticks[ticks.length - 1];
  const y = (v: number) => MARGIN.top + (1 - v / y1) * innerH;
  const baseline = y(0);

  const bandW = buckets.length > 0 ? innerW / buckets.length : 0;
  const barW = Math.max(2, Math.min(MAX_BAR, (bandW - GAP - 8) / 2));
  const groupW = barW * 2 + GAP;
  const groupX = (i: number) => MARGIN.left + i * bandW + (bandW - groupW) / 2;

  const stride = Math.max(1, Math.ceil(buckets.length / 12));
  const hovered = hover !== null ? buckets[hover] : null;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm" style={{ background: "var(--viz-income)" }} />
          Income
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm" style={{ background: "var(--viz-expense)" }} />
          Expenses
        </span>
      </div>

      <div ref={ref} className="relative w-full select-none">
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label="Income and expenses per period"
            className="block overflow-visible"
            onMouseLeave={() => setHover(null)}
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

            {buckets.map((b, i) => (
              <g key={b.key} opacity={hover === null || hover === i ? 1 : 0.45}>
                <path d={roundedTopBar(groupX(i), y(b.incomeCents), barW, baseline)} fill="var(--viz-income)" />
                <path
                  d={roundedTopBar(groupX(i) + barW + GAP, y(b.expenseCents), barW, baseline)}
                  fill="var(--viz-expense)"
                />
                {i % stride === 0 && (
                  <text
                    x={groupX(i) + groupW / 2}
                    y={HEIGHT - MARGIN.bottom + 18}
                    textAnchor="middle"
                    className={AXIS_TEXT}
                  >
                    {b.label}
                  </text>
                )}
                <rect
                  x={MARGIN.left + i * bandW}
                  y={MARGIN.top}
                  width={bandW}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                />
              </g>
            ))}
          </svg>
        )}

        {hovered && hover !== null && width > 0 && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-40 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md dark:border-zinc-700 dark:bg-zinc-800"
            style={{
              left: groupX(hover) + groupW / 2,
              transform:
                groupX(hover) > width * 0.7 ? "translate(calc(-100% - 12px), 0)" : "translate(12px, 0)",
            }}
          >
            <div className="font-medium">{hovered.label}</div>
            <dl className="mt-1 space-y-0.5 tabular-nums">
              <TooltipRow swatch="var(--viz-income)" label="Income" value={formatCents(hovered.incomeCents)} />
              <TooltipRow swatch="var(--viz-expense)" label="Expenses" value={formatCents(hovered.expenseCents)} />
              <TooltipRow label="Net" value={formatCents(hovered.netCents)} />
              <TooltipRow label="End balance" value={formatCents(hovered.endBalanceCents)} />
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

function TooltipRow({ swatch, label, value }: { swatch?: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
        {swatch && <span className="inline-block size-2 rounded-sm" style={{ background: swatch }} />}
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}
