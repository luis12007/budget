import {
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  getDate,
  getDaysInMonth,
  getMonth,
  setDate,
  setMonth,
  startOfMonth,
  startOfYear,
} from "date-fns";
import { fromKey, toKey } from "./dates";
import type { Occurrence, RecurringRule, Transaction, TransactionKind, Vault } from "./types";

function clampToMonth(monthStart: Date, day: number): string {
  return toKey(setDate(monthStart, Math.min(day, getDaysInMonth(monthStart))));
}

export function expandRule(rule: RecurringRule, from: string, to: string): string[] {
  const lower = rule.startDate > from ? rule.startDate : from;
  const upper = rule.endDate && rule.endDate < to ? rule.endDate : to;
  if (lower > upper) return [];

  const start = fromKey(rule.startDate);
  const lowerDate = fromKey(lower);
  const dates: string[] = [];

  switch (rule.frequency) {
    case "WEEKLY":
    case "BIWEEKLY": {
      const stepWeeks = rule.frequency === "BIWEEKLY" ? 2 : 1;
      const weeksAhead =
        Math.ceil(differenceInCalendarDays(lowerDate, start) / 7 / stepWeeks) * stepWeeks;
      let cursor = addWeeks(start, Math.max(0, weeksAhead));
      while (toKey(cursor) <= upper) {
        dates.push(toKey(cursor));
        cursor = addWeeks(cursor, stepWeeks);
      }
      break;
    }
    case "MONTHLY": {
      const day = getDate(start);
      let month = startOfMonth(lowerDate);
      while (toKey(month) <= upper) {
        const key = clampToMonth(month, day);
        if (key >= lower && key <= upper) dates.push(key);
        month = addMonths(month, 1);
      }
      break;
    }
    case "YEARLY": {
      const day = getDate(start);
      const monthIndex = getMonth(start);
      let year = startOfYear(lowerDate);
      while (toKey(year) <= upper) {
        const key = clampToMonth(setMonth(year, monthIndex), day);
        if (key >= lower && key <= upper) dates.push(key);
        year = addYears(year, 1);
      }
      break;
    }
  }

  return dates;
}

// Does this entry move the liquid money total?
// - Unassigned entries do (today's behaviour).
// - Entries assigned to a vault do only if that vault counts in the total.
// - Card charges don't: the money leaves when the card is paid.
// - Card payments do only when they come out of a counted vault.
export function entryAffectsTotal(
  entry: { kind: TransactionKind; vaultId: string | null; cardId: string | null },
  countedVaultIds: Set<string>,
): boolean {
  if (entry.kind === "CARD_PAYMENT") return !!entry.vaultId && countedVaultIds.has(entry.vaultId);
  if (entry.cardId) return false;
  if (entry.vaultId) return countedVaultIds.has(entry.vaultId);
  return true;
}

export function buildOccurrences(
  transactions: Transaction[],
  rules: RecurringRule[],
  from: string,
  to: string,
  vaults: Vault[],
): Occurrence[] {
  const counted = new Set(vaults.filter((v) => v.countsInTotal).map((v) => v.id));
  const materialized = new Set(
    transactions
      .filter((t) => t.recurringRuleId)
      .map((t) => `${t.recurringRuleId}:${t.date}`),
  );

  const occurrences: Occurrence[] = [];

  for (const t of transactions) {
    if (t.date < from || t.date > to) continue;
    occurrences.push({
      key: `t:${t.id}`,
      date: t.date,
      type: t.type,
      kind: t.kind,
      amountCents: t.amountCents,
      description: t.description,
      category: t.category,
      vaultId: t.vaultId,
      cardId: t.cardId,
      affectsTotal: entryAffectsTotal(t, counted),
      source: "transaction",
      transactionId: t.id,
      recurringRuleId: t.recurringRuleId ?? undefined,
    });
  }

  for (const rule of rules) {
    if (!rule.active) continue;
    const entry = { kind: "ENTRY" as const, vaultId: rule.vaultId, cardId: rule.cardId };
    for (const date of expandRule(rule, from, to)) {
      if (materialized.has(`${rule.id}:${date}`)) continue;
      occurrences.push({
        key: `r:${rule.id}:${date}`,
        date,
        type: rule.type,
        kind: "ENTRY",
        amountCents: rule.amountCents,
        description: rule.description,
        category: rule.category,
        vaultId: rule.vaultId,
        cardId: rule.cardId,
        affectsTotal: entryAffectsTotal(entry, counted),
        source: "recurring",
        recurringRuleId: rule.id,
      });
    }
  }

  occurrences.sort((a, b) => a.date.localeCompare(b.date));
  return occurrences;
}
