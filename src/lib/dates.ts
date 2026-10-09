import { format, parseISO } from "date-fns";

const DATE_KEY = "yyyy-MM-dd";

export function toKey(date: Date): string {
  return format(date, DATE_KEY);
}

export function fromKey(key: string): Date {
  return parseISO(key);
}

export function todayKey(): string {
  return toKey(new Date());
}

export function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(fromKey(value).getTime());
}

export function monthPrefix(date: Date): string {
  return format(date, "yyyy-MM");
}
