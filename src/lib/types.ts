export type EntryType = "EXPENSE" | "INCOME";
export type Frequency = "WEEKLY" | "MONTHLY" | "YEARLY";

export interface Transaction {
  id: string;
  date: string;
  type: EntryType;
  amountCents: number;
  description: string;
  category: string | null;
  recurringRuleId: string | null;
}

export interface RecurringRule {
  id: string;
  description: string;
  type: EntryType;
  amountCents: number;
  frequency: Frequency;
  startDate: string;
  endDate: string | null;
  category: string | null;
  active: boolean;
}

export interface Settings {
  balanceCents: number;
  balanceDate: string;
}

export interface Occurrence {
  key: string;
  date: string;
  type: EntryType;
  amountCents: number;
  description: string;
  category: string | null;
  source: "transaction" | "recurring";
  transactionId?: string;
  recurringRuleId?: string;
}

export type ActionResult = { ok: true } | { ok: false; error: string; locked?: boolean };
