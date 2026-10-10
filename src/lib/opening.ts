// Fixed starting money. It is part of the code, not the database, and cannot be edited or deleted.
// Balances are counted from this date on. Vault balances do not change the total.
export const OPENING = {
  date: "2026-10-01",
  amountCents: 600000,
  description: "Savings withdrawal",
  category: "savings",
} as const;
