import { todayKey } from "./dates";
import { prisma } from "./prisma";
import type { CreditCard, RecurringRule, Settings, Transaction, Vault } from "./types";

const DEFAULT_VAULTS = [
  { id: "blocked", name: "Blocked account", emoji: "🔒", sortOrder: 0 },
  { id: "digital", name: "Digital", emoji: "💳", sortOrder: 1 },
  { id: "cash", name: "Cash", emoji: "💵", sortOrder: 2 },
];

// Credit cards with their limits. They start fully paid (nothing owed).
const DEFAULT_CARDS = [
  { id: "bac", name: "BAC", emoji: "🔴", limitCents: 357000, sortOrder: 0 },
  { id: "cuscatlan", name: "Cuscatlán", emoji: "🔵", limitCents: 89200, sortOrder: 1 },
  { id: "agricola", name: "Agrícola", emoji: "🟢", limitCents: 58000, sortOrder: 2 },
];

export async function loadData() {
  const settingsRow = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, balanceDate: todayKey() },
  });

  for (const vault of DEFAULT_VAULTS) {
    await prisma.vault.upsert({ where: { id: vault.id }, update: {}, create: vault });
  }
  for (const card of DEFAULT_CARDS) {
    await prisma.creditCard.upsert({ where: { id: card.id }, update: {}, create: card });
  }

  const [vaultRows, cardRows, transactionRows, ruleRows] = await Promise.all([
    prisma.vault.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.creditCard.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.transaction.findMany({ orderBy: { date: "asc" } }),
    prisma.recurringRule.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const vaults: Vault[] = vaultRows.map((v) => ({
    id: v.id,
    name: v.name,
    emoji: v.emoji,
    balanceCents: v.balanceCents,
    countsInTotal: v.countsInTotal,
  }));

  const cards: CreditCard[] = cardRows.map((c) => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    limitCents: c.limitCents,
  }));

  const settings: Settings = {
    balanceCents: vaults.filter((v) => v.countsInTotal).reduce((sum, v) => sum + v.balanceCents, 0),
    balanceDate: settingsRow.balanceDate,
    trackingStart: settingsRow.trackingStart,
  };

  const transactions: Transaction[] = transactionRows.map((t) => ({
    id: t.id,
    date: t.date,
    type: t.type as Transaction["type"],
    kind: t.kind as Transaction["kind"],
    amountCents: t.amountCents,
    description: t.description,
    category: t.category,
    vaultId: t.vaultId,
    cardId: t.cardId,
    recurringRuleId: t.recurringRuleId,
  }));

  const rules: RecurringRule[] = ruleRows.map((r) => ({
    id: r.id,
    description: r.description,
    type: r.type as RecurringRule["type"],
    amountCents: r.amountCents,
    frequency: r.frequency as RecurringRule["frequency"],
    startDate: r.startDate,
    endDate: r.endDate,
    category: r.category,
    vaultId: r.vaultId,
    cardId: r.cardId,
    active: r.active,
  }));

  return { settings, vaults, cards, transactions, rules };
}
