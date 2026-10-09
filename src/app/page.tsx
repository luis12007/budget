import { BudgetApp } from "@/components/BudgetApp";
import { isEditUnlocked } from "@/lib/auth";
import { loadData } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [canEdit, data] = await Promise.all([isEditUnlocked(), loadData()]);

  return (
    <BudgetApp
      canEdit={canEdit}
      settings={data.settings}
      vaults={data.vaults}
      transactions={data.transactions}
      rules={data.rules}
    />
  );
}
