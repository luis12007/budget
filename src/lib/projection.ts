import type { EntryType, Occurrence, Settings } from "./types";

export function signedAmount(entry: { type: EntryType; amountCents: number }): number {
  return entry.type === "INCOME" ? entry.amountCents : -entry.amountCents;
}

// The stored balance is "as of end of balanceDate", so entries on that date are already included.
export function balanceAt(settings: Settings, occurrences: Occurrence[], dateKey: string): number {
  let sum = 0;
  if (dateKey >= settings.balanceDate) {
    for (const o of occurrences) {
      if (o.date > settings.balanceDate && o.date <= dateKey) sum += signedAmount(o);
    }
    return settings.balanceCents + sum;
  }
  for (const o of occurrences) {
    if (o.date > dateKey && o.date <= settings.balanceDate) sum += signedAmount(o);
  }
  return settings.balanceCents - sum;
}

export interface Summary {
  incomeCents: number;
  expenseCents: number;
  netCents: number;
}

export function summarize(occurrences: Occurrence[]): Summary {
  let incomeCents = 0;
  let expenseCents = 0;
  for (const o of occurrences) {
    if (o.type === "INCOME") incomeCents += o.amountCents;
    else expenseCents += o.amountCents;
  }
  return { incomeCents, expenseCents, netCents: incomeCents - expenseCents };
}

export function groupByDate(occurrences: Occurrence[]): Map<string, Occurrence[]> {
  const map = new Map<string, Occurrence[]>();
  for (const o of occurrences) {
    const list = map.get(o.date);
    if (list) list.push(o);
    else map.set(o.date, [o]);
  }
  return map;
}
