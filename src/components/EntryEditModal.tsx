"use client";

import { useState, useTransition } from "react";
import { updateRecurringRule, updateTransaction } from "@/app/actions";
import { encodeAccount } from "@/lib/accounts";
import { categoriesFor, getCategory } from "@/lib/categories";
import type { CreditCard, EntryType, RecurringRule, Transaction, Vault } from "@/lib/types";
import { useHandleResult } from "./ActionFeedback";
import { AccountPicker } from "./AccountPicker";
import { CategoryPicker } from "./CategoryPicker";
import { Button, Input, Label, Modal, Select, cx } from "./ui";

export type EditTarget =
  | { kind: "transaction"; transaction: Transaction }
  | { kind: "rule"; rule: RecurringRule };

export function EntryEditModal({
  target,
  vaults,
  cards,
  onClose,
}: {
  target: EditTarget;
  vaults: Vault[];
  cards: CreditCard[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const handleResult = useHandleResult();

  const entry = target.kind === "rule" ? target.rule : target.transaction;
  const isCardPayment = target.kind === "transaction" && target.transaction.kind === "CARD_PAYMENT";

  const [type, setType] = useState<EntryType>(entry.type);
  const [category, setCategory] = useState<string>(entry.category ?? categoriesFor(entry.type)[0].id);
  const [account, setAccount] = useState(
    encodeAccount({ vaultId: entry.vaultId, cardId: isCardPayment ? null : entry.cardId }),
  );

  const changeType = (next: EntryType) => {
    setType(next);
    setCategory(categoriesFor(next)[0].id);
    // Income can't go to a credit card.
    if (next === "INCOME" && account.startsWith("card:")) setAccount("");
  };

  const title =
    target.kind === "rule" ? "Edit recurring rule" : isCardPayment ? "Edit card payment" : "Edit entry";

  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="space-y-4"
        action={(formData) => {
          startTransition(async () => {
            const result =
              target.kind === "rule"
                ? await updateRecurringRule(formData)
                : await updateTransaction(formData);
            handleResult(result);
            if (result.ok) onClose();
          });
        }}
      >
        <input type="hidden" name="id" value={entry.id} />

        {!isCardPayment && (
          <>
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
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <Label htmlFor="e-description">Name</Label>
            <Input
              id="e-description"
              name="description"
              maxLength={200}
              defaultValue={entry.description}
              placeholder={getCategory(category)?.label}
            />
          </div>
          <div>
            <Label htmlFor="e-amount">Amount</Label>
            <Input
              id="e-amount"
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              defaultValue={(entry.amountCents / 100).toFixed(2)}
              required
            />
          </div>
          {target.kind === "rule" ? (
            <>
              <div>
                <Label htmlFor="e-frequency">Repeats</Label>
                <Select id="e-frequency" name="frequency" defaultValue={target.rule.frequency}>
                  <option value="WEEKLY">Weekly</option>
                  <option value="BIWEEKLY">Every 2 weeks</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="e-start">First date</Label>
                <Input id="e-start" name="startDate" type="date" defaultValue={target.rule.startDate} required />
              </div>
              <div>
                <Label htmlFor="e-end">Ends (optional)</Label>
                <Input id="e-end" name="endDate" type="date" defaultValue={target.rule.endDate ?? ""} />
              </div>
            </>
          ) : (
            <div>
              <Label htmlFor="e-date">Date</Label>
              <Input id="e-date" name="date" type="date" defaultValue={target.transaction.date} required />
            </div>
          )}
        </div>

        <AccountPicker
          id="e-account"
          type={type}
          value={account}
          onChange={setAccount}
          vaults={vaults}
          cards={isCardPayment ? [] : cards}
        />

        {target.kind === "rule" && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Changing a rule updates its future occurrences. Entries you already confirmed keep their
            old values.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={pending}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
