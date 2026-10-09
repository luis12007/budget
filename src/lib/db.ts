import { todayKey } from "./dates";
import { prisma } from "./prisma";
import type { RecurringRule, Settings, Transaction, Vault } from "./types";

const DEFAULT_VAULTS = [
  { id: "blocked", name: "Blocked account", emoji: "🔒", sortOrder: 0 },
  { id: "digital", name: "Digital", emoji: "💳", sortOrder: 1 },
  { id: "cash", name: "Cash", emoji: "💵", sortOrder: 2 },
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

  const [vaultRows, transactionRows, ruleRows] = await Promise.all([
    prisma.vault.findMany({ orderBy: { sortOrder: "asc" } }),
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

  const settings: Settings = {
    balanceCents: vaults.filter((v) => v.countsInTotal).reduce((sum, v) => sum + v.balanceCents, 0),
    balanceDate: settingsRow.balanceDate,
    trackingStart: settingsRow.trackingStart,
  };

  const transactions: Transaction[] = transactionRows.map((t) => ({
    id: t.id,
    date: t.date,
    type: t.type as Transaction["type"],
    amountCents: t.amountCents,
    description: t.description,
    category: t.category,
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
    active: r.active,
  }));

  return { settings, vaults, transactions, rules };
}
