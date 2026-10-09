import { BudgetApp } from "@/components/BudgetApp";
import { isEditUnlocked } from "@/lib/auth";
import { todayKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import type { RecurringRule, Transaction } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [canEdit, settings, transactions, rules] = await Promise.all([
    isEditUnlocked(),
    prisma.settings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, balanceCents: 0, balanceDate: todayKey() },
    }),
    prisma.transaction.findMany({ orderBy: { date: "asc" } }),
    prisma.recurringRule.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <BudgetApp
      canEdit={canEdit}
      settings={{ balanceCents: settings.balanceCents, balanceDate: settings.balanceDate }}
      transactions={transactions.map(
        (t): Transaction => ({
          id: t.id,
          date: t.date,
          type: t.type as Transaction["type"],
          amountCents: t.amountCents,
          description: t.description,
          category: t.category,
          recurringRuleId: t.recurringRuleId,
        }),
      )}
      rules={rules.map(
        (r): RecurringRule => ({
          id: r.id,
          description: r.description,
          type: r.type as RecurringRule["type"],
          amountCents: r.amountCents,
          frequency: r.frequency as RecurringRule["frequency"],
          startDate: r.startDate,
          endDate: r.endDate,
          category: r.category,
          active: r.active,
        }),
      )}
    />
  );
}
