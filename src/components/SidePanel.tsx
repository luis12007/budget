"use client";

import { format } from "date-fns";
import { Flag, Pencil, Repeat } from "lucide-react";
import { useTransition } from "react";
import { setVaultCounts } from "@/app/actions";
import { categoryEmoji } from "@/lib/categories";
import { fromKey } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import type { Summary } from "@/lib/projection";
import type { Occurrence, Settings, Vault } from "@/lib/types";
import { useHandleResult } from "./ActionFeedback";
import { Amount, Button, Card, Switch, cx } from "./ui";

export function SidePanel({
  settings,
  vaults,
  today,
  todayBalance,
  periodLabel,
  summary,
  endBalance,
  lowest,
  upcoming,
  editMode,
  onAdjustVault,
  onEditTrackingStart,
  onManageRecurring,
  onSelectDay,
}: {
  settings: Settings;
  vaults: Vault[];
  today: string;
  todayBalance: number;
  periodLabel: string;
  summary: Summary;
  endBalance: number;
  lowest: { date: string; balance: number } | null;
  upcoming: Occurrence[];
  editMode: boolean;
  onAdjustVault: (vault: Vault) => void;
  onEditTrackingStart: () => void;
  onManageRecurring: () => void;
  onSelectDay: (dateKey: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const handleResult = useHandleResult();
  const notCounted = vaults.filter((v) => !v.countsInTotal).reduce((s, v) => s + v.balanceCents, 0);
  const balanceIsFromToday = settings.balanceDate >= today;

  return (
    <aside className="flex flex-col gap-3">
      <Card className="p-4">
        <div className="text-xs font-medium text-zinc-500 uppercase dark:text-zinc-400">
          {balanceIsFromToday ? "Money today" : "Projected today"}
        </div>
        <div
          className={cx(
            "mt-1 text-3xl font-semibold",
            todayBalance < 0 && "text-rose-600 dark:text-rose-400",
          )}
        >
          {formatCents(todayBalance)}
        </div>
        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {balanceIsFromToday
            ? "Sum of the vaults that count. Future income is not included."
            : `Vaults total ${formatCents(settings.balanceCents)} on ${format(fromKey(settings.balanceDate), "d MMM")}, adjusted by entries since then.`}
        </div>

        <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
          {vaults.map((v) => (
            <li
              key={v.id}
              className={cx("flex items-center gap-3 py-2.5", !v.countsInTotal && "opacity-60")}
            >
              <span className="w-6 shrink-0 text-center text-lg leading-none" aria-hidden>
                {v.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{v.name}</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {v.countsInTotal ? "Counts in total" : "Not counted"}
                </div>
              </div>
              <span className="text-sm font-semibold tabular-nums">{formatCents(v.balanceCents)}</span>
              {editMode && (
                <>
                  <Switch
                    checked={v.countsInTotal}
                    label=""
                    onChange={(counts) =>
                      startTransition(async () => handleResult(await setVaultCounts(v.id, counts)))
                    }
                  />
                  <Button
                    variant="ghost"
                    className="size-8 px-0"
                    title={`Adjust ${v.name}`}
                    disabled={pending}
                    onClick={() => onAdjustVault(v)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>

        {notCounted > 0 && (
          <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Not counted: {formatCents(notCounted)}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-zinc-200 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <Flag className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            Tracking since {format(fromKey(settings.trackingStart), "d MMM yyyy")}
          </span>
          {editMode && (
            <button
              type="button"
              onClick={onEditTrackingStart}
              className="font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
            >
              Change
            </button>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 text-xs font-medium text-zinc-500 uppercase dark:text-zinc-400">
          {periodLabel}
        </div>
        <dl className="space-y-2 text-sm">
          <Row label="Income">
            <Amount cents={summary.incomeCents} type="INCOME" />
          </Row>
          <Row label="Expenses">
            <Amount cents={summary.expenseCents} type="EXPENSE" />
          </Row>
          <Row label="Net">
            <Amount cents={summary.netCents} type="NET" className="font-medium" />
          </Row>
          <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
          <Row label="Projected end balance">
            <span
              className={cx(
                "font-semibold tabular-nums",
                endBalance < 0 && "text-rose-600 dark:text-rose-400",
              )}
            >
              {formatCents(endBalance)}
            </span>
          </Row>
          {lowest && (
            <Row label={`Lowest (${format(fromKey(lowest.date), "d MMM")})`}>
              <span
                className={cx(
                  "tabular-nums",
                  lowest.balance < 0 && "font-medium text-rose-600 dark:text-rose-400",
                )}
              >
                {formatCents(lowest.balance)}
              </span>
            </Row>
          )}
        </dl>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-medium text-zinc-500 uppercase dark:text-zinc-400">
            Next 30 days
          </div>
          <Button variant="ghost" onClick={onManageRecurring} className="-my-2 -mr-2 h-8 px-2">
            <Repeat className="size-4" />
            Recurring
          </Button>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Nothing scheduled.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {upcoming.map((o) => (
              <li key={o.key}>
                <button
                  type="button"
                  onClick={() => onSelectDay(o.date)}
                  className="flex w-full items-center gap-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                >
                  <span className="w-12 shrink-0 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                    {format(fromKey(o.date), "d MMM")}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-1 truncate">
                    <span className="shrink-0" aria-hidden>
                      {categoryEmoji(o.category, o.type)}
                    </span>
                    {o.source === "recurring" && (
                      <Repeat className="size-3 shrink-0 text-zinc-400" />
                    )}
                    <span className="truncate">{o.description}</span>
                  </span>
                  <Amount cents={o.amountCents} type={o.type} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </aside>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
