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
import type { Occurrence, RecurringRule, Transaction } from "./types";

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
    case "WEEKLY": {
      const weeksAhead = Math.ceil(differenceInCalendarDays(lowerDate, start) / 7);
      let cursor = addWeeks(start, Math.max(0, weeksAhead));
      while (toKey(cursor) <= upper) {
        dates.push(toKey(cursor));
        cursor = addWeeks(cursor, 1);
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

export function buildOccurrences(
  transactions: Transaction[],
  rules: RecurringRule[],
  from: string,
  to: string,
): Occurrence[] {
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
      amountCents: t.amountCents,
      description: t.description,
      category: t.category,
      source: "transaction",
      transactionId: t.id,
      recurringRuleId: t.recurringRuleId ?? undefined,
    });
  }

  for (const rule of rules) {
    if (!rule.active) continue;
    for (const date of expandRule(rule, from, to)) {
      if (materialized.has(`${rule.id}:${date}`)) continue;
      occurrences.push({
        key: `r:${rule.id}:${date}`,
        date,
        type: rule.type,
        amountCents: rule.amountCents,
        description: rule.description,
        category: rule.category,
        source: "recurring",
        recurringRuleId: rule.id,
      });
    }
  }

  occurrences.sort((a, b) => a.date.localeCompare(b.date));
  return occurrences;
}
