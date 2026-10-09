"use client";

import { eachMonthOfInterval, endOfMonth, endOfYear, format, startOfYear } from "date-fns";
import { Flag } from "lucide-react";
import { monthPrefix, toKey } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { balanceAt, summarize } from "@/lib/projection";
import type { Occurrence, Settings } from "@/lib/types";
import { Amount, cx } from "./ui";

export function YearView({
  cursor,
  today,
  settings,
  occurrences,
  onSelectMonth,
}: {
  cursor: Date;
  today: string;
  settings: Settings;
  occurrences: Occurrence[];
  onSelectMonth: (month: Date) => void;
}) {
  const months = eachMonthOfInterval({ start: startOfYear(cursor), end: endOfYear(cursor) });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {months.map((month) => {
        const prefix = monthPrefix(month);
        const monthEnd = toKey(endOfMonth(month));
        const untracked = monthEnd < settings.trackingStart;
        const isStartMonth = settings.trackingStart.startsWith(prefix);
        const entries = occurrences.filter((o) => o.date.startsWith(prefix));
        const summary = summarize(entries);
        const endBalance = balanceAt(settings, occurrences, monthEnd);
        const isCurrent = today.startsWith(prefix);

        return (
          <button
            key={prefix}
            type="button"
            onClick={() => onSelectMonth(month)}
            className={cx(
              "rounded-xl border bg-white p-4 text-left transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/60",
              isCurrent
                ? "border-zinc-900 dark:border-zinc-200"
                : "border-zinc-200 dark:border-zinc-800",
              untracked && "untracked text-zinc-400 dark:text-zinc-600",
            )}
          >
            <div className="mb-3 flex items-baseline justify-between">
              <span className="font-semibold">{format(month, "MMMM")}</span>
              {untracked ? (
                <span className="text-xs">Not tracked</span>
              ) : isStartMonth ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 uppercase dark:bg-emerald-950/50 dark:text-emerald-300">
                  <Flag className="size-3" /> Start
                </span>
              ) : (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {entries.length} {entries.length === 1 ? "entry" : "entries"}
                </span>
              )}
            </div>
            {!untracked && (
              <dl className="space-y-1.5 text-sm">
                <Row label="Income">
                  <Amount cents={summary.incomeCents} type="INCOME" />
                </Row>
                <Row label="Expenses">
                  <Amount cents={summary.expenseCents} type="EXPENSE" />
                </Row>
                <Row label="Net">
                  <Amount cents={summary.netCents} type="NET" className="font-medium" />
                </Row>
                <Row label="End balance">
                  <span
                    className={cx(
                      "font-semibold tabular-nums",
                      endBalance < 0 && "text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {formatCents(endBalance)}
                  </span>
                </Row>
              </dl>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
