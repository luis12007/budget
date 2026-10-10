export type EntryType = "EXPENSE" | "INCOME";
export type Frequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";

// ENTRY = a regular income or expense (a purchase charged to a credit card is still an ENTRY).
// CARD_PAYMENT = money moved from a vault to a credit card to pay it down.
export type TransactionKind = "ENTRY" | "CARD_PAYMENT";

export interface Transaction {
  id: string;
  date: string;
  type: EntryType;
  kind: TransactionKind;
  amountCents: number;
  description: string;
  category: string | null;
  // Vault the money comes from (expense / card payment) or goes to (income). null = not assigned.
  vaultId: string | null;
  // Credit card impacted: a charge (ENTRY expense) or a payment (CARD_PAYMENT). null = none.
  cardId: string | null;
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
  vaultId: string | null;
  cardId: string | null;
  active: boolean;
}

export interface Vault {
  id: string;
  name: string;
  emoji: string;
  // Real balance as of end of Settings.balanceDate. Later assigned entries are projected on top.
  balanceCents: number;
  countsInTotal: boolean;
}

export interface CreditCard {
  id: string;
  name: string;
  emoji: string;
  limitCents: number;
  // Day of the month the statement closes (1-31). null = not set.
  cutoffDay: number | null;
}

export interface Settings {
  // Sum of vaults that count toward the total, valid as of end of balanceDate.
  balanceCents: number;
  balanceDate: string;
  trackingStart: string;
}

export interface Occurrence {
  key: string;
  date: string;
  type: EntryType;
  kind: TransactionKind;
  amountCents: number;
  description: string;
  category: string | null;
  vaultId: string | null;
  cardId: string | null;
  // Whether this occurrence moves the money total (liquid money). Card charges don't; a card
  // payment does only when it comes out of a vault that counts in the total.
  affectsTotal: boolean;
  source: "transaction" | "recurring";
  transactionId?: string;
  recurringRuleId?: string;
}

export interface Highlight {
  id: string;
  date: string;
  description: string;
  transactionId: string | null;
  recurringRuleId: string | null;
}

export type ActionResult = { ok: true } | { ok: false; error: string; locked?: boolean };
