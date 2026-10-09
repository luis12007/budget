import { addDays, differenceInCalendarMonths, eachDayOfInterval, format } from "date-fns";
import { fromKey, toKey } from "./dates";
import { balanceAt, groupByDate, signedAmount } from "./projection";
import { buildOccurrences } from "./recurring";
import type { RecurringRule, Settings, Transaction } from "./types";

export type Granularity = "month" | "year";

export interface ForecastPoint {
  date: string;
  balance: number;
}

export interface FlowBucket {
  key: string;
  label: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  endBalanceCents: number;
}

export interface Forecast {
  points: ForecastPoint[];
  runsOut: string | null;
  lowest: ForecastPoint;
  end: ForecastPoint;
  buckets: FlowBucket[];
  avgMonthlyNetCents: number;
}

function bucketKey(date: string, granularity: Granularity): string {
  return granularity === "month" ? date.slice(0, 7) : date.slice(0, 4);
}

function bucketLabel(key: string, granularity: Granularity): string {
  return granularity === "month" ? format(fromKey(`${key}-01`), "MMM yy") : key;
}

export function buildForecast(
  settings: Settings,
  transactions: Transaction[],
  rules: RecurringRule[],
  from: string,
  to: string,
  granularity: Granularity,
): Forecast {
  const lo = from < settings.balanceDate ? from : settings.balanceDate;
  const hi = to > settings.balanceDate ? to : settings.balanceDate;
  const occurrences = buildOccurrences(transactions, rules, lo, hi);
  const byDate = groupByDate(occurrences);

  const startBalance = balanceAt(settings, occurrences, toKey(addDays(fromKey(from), -1)));
  let balance = startBalance;

  const points: ForecastPoint[] = [];
  const buckets = new Map<string, FlowBucket>();

  for (const day of eachDayOfInterval({ start: fromKey(from), end: fromKey(to) })) {
    const date = toKey(day);
    const key = bucketKey(date, granularity);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        key,
        label: bucketLabel(key, granularity),
        incomeCents: 0,
        expenseCents: 0,
        netCents: 0,
        endBalanceCents: 0,
      };
      buckets.set(key, bucket);
    }

    for (const o of byDate.get(date) ?? []) {
      balance += signedAmount(o);
      if (o.type === "INCOME") bucket.incomeCents += o.amountCents;
      else bucket.expenseCents += o.amountCents;
    }
    bucket.netCents = bucket.incomeCents - bucket.expenseCents;
    bucket.endBalanceCents = balance;
    points.push({ date, balance });
  }

  let lowest = points[0];
  for (const p of points) if (p.balance < lowest.balance) lowest = p;
  const end = points[points.length - 1];

  const months = Math.max(1, differenceInCalendarMonths(fromKey(to), fromKey(from)) + 1);

  return {
    points,
    runsOut: points.find((p) => p.balance < 0)?.date ?? null,
    lowest,
    end,
    buckets: [...buckets.values()],
    avgMonthlyNetCents: Math.round((end.balance - startBalance) / months),
  };
}
