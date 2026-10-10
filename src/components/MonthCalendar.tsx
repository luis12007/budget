"use client";

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  getDate,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Flag, Repeat } from "lucide-react";
import { entryEmoji, entryFilterKey } from "@/lib/categories";
import { toKey } from "@/lib/dates";
import { formatCents, formatCompactCents } from "@/lib/money";
import { summarize } from "@/lib/projection";
import type { Occurrence } from "@/lib/types";
import { Amount, cx } from "./ui";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS = 3;

export function MonthCalendar({
  cursor,
  today,
  trackingStart,
  occurrencesByDate,
  balanceByDate,
  onSelectDay,
  hiddenKeys,
}: {
  cursor: Date;
  today: string;
  trackingStart: string;
  occurrencesByDate: Map<string, Occurrence[]>;
  balanceByDate: Map<string, number>;
  onSelectDay: (dateKey: string) => void;
  hiddenKeys: Set<string>;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
  });

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-0 py-2 text-center text-[10px] font-medium text-zinc-500 uppercase sm:px-2 sm:text-xs dark:text-zinc-400"
          >
            {d}
          </div>
        ))}
      </div>

      <div
        className="grid flex-1 grid-cols-7"
        style={{ gridTemplateRows: `repeat(${days.length / 7}, minmax(0, 1fr))` }}
      >
        {days.map((day, index) => {
          const key = toKey(day);
          const inMonth = isSameMonth(day, cursor);
          const isToday = key === today;
          const untracked = key < trackingStart;
          const isStart = key === trackingStart;
          const entries = occurrencesByDate.get(key) ?? [];
          const net = summarize(entries).netCents;
          const balance = untracked ? undefined : balanceByDate.get(key);
          const visible = entries.filter((o) => !hiddenKeys.has(entryFilterKey(o)));
          const hidden = visible.length - MAX_CHIPS;

          return (
            <button
              key={key}
              type="button"
              disabled={untracked}
              title={untracked ? "Before tracking start" : undefined}
              onClick={() => onSelectDay(key)}
              className={cx(
                "relative flex min-h-16 flex-col gap-0.5 border-zinc-200 p-0.5 text-left transition-colors sm:min-h-24 sm:gap-1 sm:p-1.5 dark:border-zinc-800",
                index % 7 !== 0 && "border-l",
                index >= 7 && "border-t",
                untracked
                  ? "untracked cursor-default text-zinc-400 dark:text-zinc-600"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
                !inMonth && !untracked && "bg-zinc-50/60 text-zinc-400 dark:bg-zinc-950/40 dark:text-zinc-600",
              )}
            >
              {isStart && (
                <span
                  className="absolute inset-y-0 left-0 w-0.5 bg-emerald-500"
                  aria-hidden
                />
              )}
              <div className="flex items-center justify-between">
                <span
                  className={cx(
                    "inline-flex size-6 items-center justify-center rounded-full text-sm tabular-nums",
                    isToday && "bg-zinc-900 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900",
                  )}
                >
                  {getDate(day)}
                </span>
                {isStart ? (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 uppercase dark:bg-emerald-950/50 dark:text-emerald-300">
                    <Flag className="size-3" /><span className="hidden sm:inline">Start</span>
                  </span>
                ) : (
                  net !== 0 && (
                    <span className="hidden sm:inline">
                      <Amount cents={net} type="NET" className="text-[11px]" />
                    </span>
                  )
                )}
              </div>

              <div className="flex-1 space-y-0.5 overflow-hidden">
                {visible.slice(0, MAX_CHIPS).map((o) => (
                  <div
                    key={o.key}
                    className={cx(
                      "flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] leading-tight sm:px-1.5 sm:text-[11px]",
                      o.type === "INCOME"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
                      o.source === "recurring" && "opacity-80",
                    )}
                  >
                    <span className="shrink-0" aria-hidden>
                      {entryEmoji(o)}
                    </span>
                    {o.source === "recurring" && <Repeat className="size-3 shrink-0" />}
                    <span className="hidden truncate sm:inline">{o.description}</span>
                    <span className="ml-auto shrink-0 tabular-nums sm:hidden">{formatCompactCents(o.amountCents)}</span>
                    <span className="ml-auto hidden shrink-0 tabular-nums sm:inline">{formatCents(o.amountCents)}</span>
                  </div>
                ))}
                {hidden > 0 && (
                  <div className="px-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    +{hidden} more
                  </div>
                )}
              </div>

              {balance !== undefined && (
                <div
                  className={cx(
                    "truncate text-right text-[9px] tabular-nums sm:text-[11px]",
                    balance < 0
                      ? "font-medium text-rose-600 dark:text-rose-400"
                      : "text-zinc-500 dark:text-zinc-400",
                  )}
                >
                  <span className="sm:hidden">{formatCompactCents(balance)}</span>
                  <span className="hidden sm:inline">{formatCents(balance)}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
