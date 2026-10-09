"use client";

import { addDays, addMonths, differenceInCalendarDays, format } from "date-fns";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { fromKey, toKey } from "@/lib/dates";
import { buildForecast, type Granularity } from "@/lib/forecast";
import { formatCents, formatSignedCents } from "@/lib/money";
import type { RecurringRule, Settings, Transaction } from "@/lib/types";
import { Card, cx } from "../ui";
import { BalanceChart } from "./BalanceChart";
import { FlowChart } from "./FlowChart";

const HORIZONS = [
  { label: "1 month", months: 1 },
  { label: "3 months", months: 3 },
  { label: "6 months", months: 6 },
  { label: "1 year", months: 12 },
  { label: "2 years", months: 24 },
  { label: "3 years", months: 36 },
] as const;

export function ForecastView({
  settings,
  transactions,
  rules,
  today,
}: {
  settings: Settings;
  transactions: Transaction[];
  rules: RecurringRule[];
  today: string;
}) {
  const [months, setMonths] = useState<number>(12);
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [display, setDisplay] = useState<"chart" | "table">("chart");

  const to = useMemo(() => toKey(addDays(addMonths(fromKey(today), months), -1)), [today, months]);

  const forecast = useMemo(
    () => buildForecast(settings, transactions, rules, today, to, granularity),
    [settings, transactions, rules, today, to, granularity],
  );

  const horizonLabel = HORIZONS.find((h) => h.months === months)?.label ?? `${months} months`;
  const startsNegative = forecast.points[0].balance < 0;
  const daysUntil = forecast.runsOut ? differenceInCalendarDays(fromKey(forecast.runsOut), fromKey(today)) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Segmented
          label="Horizon"
          value={months}
          options={HORIZONS.map((h) => ({ value: h.months, label: h.label }))}
          onChange={setMonths}
        />
        <Segmented
          label="Group by"
          value={granularity}
          options={[
            { value: "month", label: "Month" },
            { value: "year", label: "Year" },
          ]}
          onChange={setGranularity}
        />
        <Segmented
          label="Show"
          value={display}
          options={[
            { value: "chart", label: "Charts" },
            { value: "table", label: "Table" },
          ]}
          onChange={setDisplay}
          className="ml-auto"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Card className="p-4 md:col-span-2">
          <div className="text-xs font-medium text-zinc-500 uppercase dark:text-zinc-400">Money runs out</div>
          {startsNegative ? (
            <HeroStatus tone="critical" value="Already negative" detail="Your balance is below zero today." />
          ) : forecast.runsOut ? (
            <HeroStatus
              tone="critical"
              value={format(fromKey(forecast.runsOut), "d MMMM yyyy")}
              detail={`In ${daysUntil} days, if nothing changes.`}
            />
          ) : (
            <HeroStatus
              tone="good"
              value={`Not within ${horizonLabel}`}
              detail={`Lowest point ${formatCents(forecast.lowest.balance)} on ${format(fromKey(forecast.lowest.date), "d MMM yyyy")}.`}
            />
          )}
        </Card>
        <Stat
          label={`Balance on ${format(fromKey(forecast.end.date), "d MMM yyyy")}`}
          value={formatCents(forecast.end.balance)}
          negative={forecast.end.balance < 0}
        />
        <Stat
          label="Average monthly net"
          value={formatSignedCents(forecast.avgMonthlyNetCents)}
          negative={forecast.avgMonthlyNetCents < 0}
        />
      </div>

      {display === "chart" ? (
        <>
          <Card className="p-4">
            <ChartTitle title="Projected balance" subtitle={`Day by day for the next ${horizonLabel}`} />
            <BalanceChart points={forecast.points} runsOut={forecast.runsOut} granularity={granularity} />
          </Card>
          <Card className="p-4">
            <ChartTitle
              title="Income vs expenses"
              subtitle={`Per ${granularity}, including recurring rules`}
            />
            <FlowChart buckets={forecast.buckets} />
          </Card>
        </>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-zinc-500 uppercase dark:text-zinc-400">
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 font-medium">{granularity === "month" ? "Month" : "Year"}</th>
                <th className="px-4 py-3 text-right font-medium">Income</th>
                <th className="px-4 py-3 text-right font-medium">Expenses</th>
                <th className="px-4 py-3 text-right font-medium">Net</th>
                <th className="px-4 py-3 text-right font-medium">End balance</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {forecast.buckets.map((b) => (
                <tr key={b.key} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                  <td className="px-4 py-2.5">{b.label}</td>
                  <td className="px-4 py-2.5 text-right">{formatCents(b.incomeCents)}</td>
                  <td className="px-4 py-2.5 text-right">{formatCents(b.expenseCents)}</td>
                  <td className="px-4 py-2.5 text-right">{formatSignedCents(b.netCents)}</td>
                  <td
                    className={cx(
                      "px-4 py-2.5 text-right font-medium",
                      b.endBalanceCents < 0 && "text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {formatCents(b.endBalanceCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cx("flex items-center gap-2", className)}>
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
      <div role="tablist" className="inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="tab"
            aria-selected={value === o.value}
            onClick={() => onChange(o.value)}
            className={cx(
              "rounded-md px-2.5 py-1 text-sm font-medium whitespace-nowrap transition-colors",
              value === o.value
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function HeroStatus({
  tone,
  value,
  detail,
}: {
  tone: "good" | "critical";
  value: string;
  detail: string;
}) {
  const Icon = tone === "good" ? CheckCircle2 : AlertTriangle;
  return (
    <div className="mt-1 flex items-start gap-3">
      <Icon
        className="mt-1 size-6 shrink-0"
        style={{ color: tone === "good" ? "var(--viz-good)" : "var(--viz-critical)" }}
        aria-label={tone === "good" ? "OK" : "Warning"}
      />
      <div>
        <div className="text-2xl font-semibold sm:text-3xl">{value}</div>
        <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{detail}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-zinc-500 uppercase dark:text-zinc-400">{label}</div>
      <div className={cx("mt-1 text-2xl font-semibold", negative && "text-rose-600 dark:text-rose-400")}>
        {value}
      </div>
    </Card>
  );
}

function ChartTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-3">
      <div className="font-semibold">{title}</div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</div>
    </div>
  );
}
