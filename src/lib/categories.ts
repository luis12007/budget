import type { EntryType, TransactionKind } from "./types";

export interface Category {
  id: string;
  label: string;
  emoji: string;
  type: EntryType;
}

export const CATEGORIES: Category[] = [
  { id: "regular_income", label: "Regular income", emoji: "💼", type: "INCOME" },
  { id: "savings", label: "Savings withdrawal", emoji: "🏦", type: "INCOME" },
  { id: "billing", label: "Billing system", emoji: "🧾", type: "INCOME" },
  { id: "external_jobs", label: "External jobs", emoji: "🛠️", type: "INCOME" },
  { id: "other_income", label: "Other income", emoji: "💰", type: "INCOME" },

  { id: "groceries", label: "Groceries", emoji: "🛒", type: "EXPENSE" },
  { id: "going_out", label: "Going out", emoji: "🎉", type: "EXPENSE" },
  { id: "transport", label: "Transport", emoji: "🚌", type: "EXPENSE" },
  { id: "university", label: "University", emoji: "🎓", type: "EXPENSE" },
  { id: "courses", label: "Courses", emoji: "📚", type: "EXPENSE" },
  { id: "home", label: "Home", emoji: "🏠", type: "EXPENSE" },
  { id: "internet", label: "Internet", emoji: "🌐", type: "EXPENSE" },
  { id: "other_expense", label: "Other expense", emoji: "💸", type: "EXPENSE" },
];

export function categoriesFor(type: EntryType): Category[] {
  return CATEGORIES.filter((c) => c.type === type);
}

export function getCategory(id: string | null | undefined): Category | undefined {
  return id ? CATEGORIES.find((c) => c.id === id) : undefined;
}

export function categoryEmoji(id: string | null | undefined, type: EntryType): string {
  return getCategory(id)?.emoji ?? (type === "INCOME" ? "💰" : "💸");
}

export const CARD_PAYMENT_FILTER = "card_payment";

// Key used to show or hide calendar entries from the filter menu.
export function entryFilterKey(entry: {
  kind: TransactionKind;
  type: EntryType;
  category: string | null;
}): string {
  if (entry.kind === "CARD_PAYMENT") return CARD_PAYMENT_FILTER;
  return getCategory(entry.category)?.id ?? (entry.type === "INCOME" ? "uncategorized_income" : "uncategorized_expense");
}

export interface FilterLegendItem {
  key: string;
  emoji: string;
  label: string;
}

// Every icon the calendar can show, with its meaning.
export function filterLegend(): FilterLegendItem[] {
  return [
    ...CATEGORIES.map((c) => ({ key: c.id, emoji: c.emoji, label: c.label })),
    { key: CARD_PAYMENT_FILTER, emoji: "💳", label: "Card payment" },
  ];
}

export function entryEmoji(entry: {
  kind: TransactionKind;
  category: string | null;
  type: EntryType;
}): string {
  if (entry.kind === "CARD_PAYMENT") return "💳";
  return categoryEmoji(entry.category, entry.type);
}
