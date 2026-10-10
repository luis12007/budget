"use client";

import { format } from "date-fns";
import { Check, Pencil, Repeat, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { addTransaction, confirmRecurring, deleteTransaction } from "@/app/actions";
import { categoriesFor, entryEmoji, getCategory } from "@/lib/categories";
import { fromKey } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { summarize } from "@/lib/projection";
import type { CreditCard, EntryType, Occurrence, Vault } from "@/lib/types";
import { useHandleResult } from "./ActionFeedback";
import { AccountPicker, AccountTag } from "./AccountPicker";
import { CategoryPicker } from "./CategoryPicker";
import { Amount, Button, Input, Label, Modal, cx } from "./ui";

export function DayModal({
  dateKey,
  entries,
  balance,
  vaults,
  cards,
  editMode,
  onClose,
  onEdit,
}: {
  dateKey: string;
  entries: Occurrence[];
  balance: number;
  vaults: Vault[];
  cards: CreditCard[];
  editMode: boolean;
  onClose: () => void;
  // Opens the editor for an entry, or for its recurring rule when it is only expected.
  onEdit: (o: Occurrence) => void;
}) {
  const [pending, startTransition] = useTransition();
  const handleResult = useHandleResult();
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<EntryType>("EXPENSE");
  const [category, setCategory] = useState(categoriesFor("EXPENSE")[0].id);
  const [account, setAccount] = useState("");
  const summary = summarize(entries);

  const changeType = (next: EntryType) => {
    setType(next);
    setCategory(categoriesFor(next)[0].id);
    // Income can't go to a credit card.
    if (next === "INCOME" && account.startsWith("card:")) setAccount("");
  };

  return (
    <Modal title={format(fromKey(dateKey), "EEEE, d MMMM yyyy")} onClose={onClose}>
      <div className="mb-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Stat label="Income">
          <Amount cents={summary.incomeCents} type="INCOME" />
        </Stat>
        <Stat label="Expenses">
          <Amount cents={summary.expenseCents} type="EXPENSE" />
        </Stat>
        <Stat label="Net">
          <Amount cents={summary.netCents} type="NET" />
        </Stat>
        <Stat label="End of day">
          <span
            className={cx(
              "font-semibold tabular-nums",
              balance < 0 && "text-rose-600 dark:text-rose-400",
            )}
          >
            {formatCents(balance)}
          </span>
        </Stat>
      </div>

      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No entries for this day.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {entries.map((o) => (
            <li key={o.key} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="w-6 shrink-0 text-center text-base leading-none" aria-hidden>
                {entryEmoji(o)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1.5">
                  <span className="truncate">{o.description}</span>
                  {o.source === "recurring" && (
                    <span
                      className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      title="Projected from a recurring rule"
                    >
                      <Repeat className="size-3" /> expected
                    </span>
                  )}
                  {o.source === "transaction" && o.recurringRuleId && (
                    <Repeat className="size-3 shrink-0 text-zinc-400" />
                  )}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {o.kind === "CARD_PAYMENT"
                    ? "Card payment"
                    : (getCategory(o.category)?.label ?? null)}
                  <AccountTag entry={o} vaults={vaults} cards={cards} />
                </span>
              </span>
              <Amount
                cents={o.amountCents}
                type={o.type}
                className={cx("font-medium", !o.affectsTotal && "opacity-70")}
              />
              {editMode && (o.transactionId || o.recurringRuleId) && (
                <Button
                  variant="ghost"
                  className="size-8 px-0"
                  disabled={pending}
                  title="Edit"
                  onClick={() => onEdit(o)}
                >
                  <Pencil className="size-4" />
                </Button>
              )}
              {editMode && o.source === "recurring" && o.recurringRuleId && (
                <Button
                  variant="ghost"
                  className="h-8 px-2"
                  disabled={pending}
                  title="Mark as paid/received"
                  onClick={() =>
                    startTransition(async () =>
                      handleResult(await confirmRecurring(o.recurringRuleId!, o.date)),
                    )
                  }
                >
                  <Check className="size-4" /> Confirm
                </Button>
              )}
              {editMode && o.source === "transaction" && o.transactionId && (
                <Button
                  variant="danger"
                  className="size-8 px-0"
                  disabled={pending}
                  title="Delete"
                  onClick={() =>
                    startTransition(async () =>
                      handleResult(await deleteTransaction(o.transactionId!)),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editMode && (
        <form
          ref={formRef}
          className="mt-4 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800"
          action={(formData) => {
            startTransition(async () => {
              const result = await addTransaction(formData);
              handleResult(result);
              if (result.ok) {
                formRef.current?.reset();
                setAccount("");
              }
            });
          }}
        >
          <input type="hidden" name="date" value={dateKey} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="category" value={category} />

          <div className="inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700">
            {(["EXPENSE", "INCOME"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => changeType(t)}
                className={cx(
                  "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                  type === t
                    ? t === "EXPENSE"
                      ? "bg-rose-600 text-white"
                      : "bg-emerald-600 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
                )}
              >
                {t === "EXPENSE" ? "Expense" : "Income"}
              </button>
            ))}
          </div>

          <CategoryPicker type={type} value={category} onChange={setCategory} />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_11rem_8rem]">
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="description">Name (optional)</Label>
              <Input
                id="description"
                name="description"
                maxLength={200}
                placeholder={getCategory(category)?.label}
              />
            </div>
            <AccountPicker
              id="account"
              type={type}
              value={account}
              onChange={setAccount}
              vaults={vaults}
              cards={cards}
            />
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
              />
            </div>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {account === ""
              ? "Not assigned: counts in your money total but doesn't move any vault."
              : account.startsWith("card:")
                ? "Charged to the card: counts as spending, your money moves when you pay the card."
                : type === "EXPENSE"
                  ? "The money leaves this vault."
                  : "The money is added to this vault."}
          </p>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={pending}>
              Add {type === "EXPENSE" ? "expense" : "income"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
      <div className="text-[11px] font-medium text-zinc-500 uppercase dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
