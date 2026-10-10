import { OPENING } from "./opening";
import type { EntryType, Occurrence, Settings, Transaction, Vault } from "./types";

export function signedAmount(entry: { type: EntryType; amountCents: number }): number {
  return entry.type === "INCOME" ? entry.amountCents : -entry.amountCents;
}

// Sums signed amounts of `occurrences` that fall in the window between `anchorDate` (exclusive,
// the day the stored balance is valid for) and `dateKey`, in either direction.
function projectFrom(
  storedCents: number,
  anchorDate: string,
  occurrences: Occurrence[],
  dateKey: string,
  include: (o: Occurrence) => boolean,
): number {
  let sum = 0;
  if (dateKey >= anchorDate) {
    for (const o of occurrences) {
      if (include(o) && o.date > anchorDate && o.date <= dateKey) sum += signedAmount(o);
    }
    return storedCents + sum;
  }
  for (const o of occurrences) {
    if (include(o) && o.date > dateKey && o.date <= anchorDate) sum += signedAmount(o);
  }
  return storedCents - sum;
}

// Money total on `dateKey`: the fixed opening amount plus every entry that affects the total from
// the opening date through `dateKey`. Vault balances do not change this total.
export function balanceAt(_settings: Settings, occurrences: Occurrence[], dateKey: string): number {
  if (dateKey < OPENING.date) return 0;
  let sum = 0;
  for (const o of occurrences) {
    if (o.affectsTotal && o.date >= OPENING.date && o.date <= dateKey) sum += signedAmount(o);
  }
  return sum;
}

// Balance of one vault on `dateKey`: its stored balance plus the entries assigned to it since.
export function vaultBalanceAt(
  vault: Vault,
  settings: Settings,
  occurrences: Occurrence[],
  dateKey: string,
): number {
  return projectFrom(
    vault.balanceCents,
    settings.balanceDate,
    occurrences,
    dateKey,
    (o) => o.vaultId === vault.id,
  );
}

export function vaultBalancesAt(
  vaults: Vault[],
  settings: Settings,
  occurrences: Occurrence[],
  dateKey: string,
): Map<string, number> {
  return new Map(vaults.map((v) => [v.id, vaultBalanceAt(v, settings, occurrences, dateKey)]));
}

// Amount owed on a credit card as of end of `dateKey`: charges minus payments (confirmed only).
export function cardOwedAt(
  cardId: string,
  transactions: Pick<Transaction, "cardId" | "date" | "kind" | "type" | "amountCents">[],
  dateKey: string,
): number {
  let owed = 0;
  for (const t of transactions) {
    if (t.cardId !== cardId || t.date > dateKey) continue;
    if (t.kind === "CARD_PAYMENT") owed -= t.amountCents;
    else owed -= signedAmount(t); // expense charge raises the debt, an income (refund) lowers it
  }
  return owed;
}

export interface Summary {
  incomeCents: number;
  expenseCents: number;
  netCents: number;
}

// Income vs spending. Card charges count as spending when they happen; paying the card later
// is a transfer, not new spending, so card payments are left out.
export function summarize(occurrences: Occurrence[]): Summary {
  let incomeCents = 0;
  let expenseCents = 0;
  for (const o of occurrences) {
    if (o.kind !== "ENTRY") continue;
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
