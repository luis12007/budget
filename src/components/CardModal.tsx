"use client";

import { format } from "date-fns";
import { Pencil, Repeat, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { addCardPayment, addTransaction, deleteTransaction, setCardCutoff } from "@/app/actions";
import { nextCutoffDate } from "@/lib/accounts";
import { categoriesFor, entryEmoji } from "@/lib/categories";
import { fromKey } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import type { CreditCard, Transaction, Vault } from "@/lib/types";
import { useHandleResult } from "./ActionFeedback";
import { AccountPicker, AccountTag } from "./AccountPicker";
import { Button, Input, Label, Modal, Select, cx } from "./ui";

type Action = "charge" | "payment";

export function CardModal({
  card,
  owed,
  history,
  vaults,
  editMode,
  today,
  onClose,
  onEditTransaction,
}: {
  card: CreditCard;
  owed: number;
  // Every charge and payment on this card, newest first.
  history: Transaction[];
  vaults: Vault[];
  editMode: boolean;
  today: string;
  onClose: () => void;
  onEditTransaction: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const handleResult = useHandleResult();
  const formRef = useRef<HTMLFormElement>(null);
  const [action, setAction] = useState<Action>("charge");
  const [payFrom, setPayFrom] = useState("");

  const available = card.limitCents - owed;
  // Bar shows what is still available: full when nothing is owed, empties as the card is used.
  const availablePct =
    card.limitCents > 0 ? Math.min(1, Math.max(0, available / card.limitCents)) : 0;
  const nextCut = card.cutoffDay ? nextCutoffDate(card.cutoffDay, today) : null;
  const expenseCategories = categoriesFor("EXPENSE");

  return (
    <Modal
      title={
        <span className="inline-flex items-center gap-2">
          <span aria-hidden>{card.emoji}</span> {card.name}
        </span>
      }
      onClose={onClose}
      wide
    >
      <div className="grid grid-cols-3 gap-2 text-sm">
        <Stat label="Owed">
          <span
            className={cx(
              "font-semibold tabular-nums",
              owed > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {formatCents(owed)}
          </span>
        </Stat>
        <Stat label="Available">
          <span
            className={cx(
              "font-semibold tabular-nums",
              available < 0 && "text-rose-600 dark:text-rose-400",
            )}
          >
            {formatCents(available)}
          </span>
        </Stat>
        <Stat label="Limit">
          <span className="font-semibold tabular-nums">{formatCents(card.limitCents)}</span>
        </Stat>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={card.limitCents}
        aria-valuenow={Math.max(0, available)}
        aria-label="Available credit"
      >
        <div
          className={cx(
            "h-full rounded-full transition-[width]",
            availablePct <= 0.2 ? "bg-rose-500" : "bg-emerald-500",
          )}
          style={{ width: `${availablePct * 100}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800/60">
        <span className="text-zinc-700 dark:text-zinc-300">
          {nextCut ? (
            <>
              Cut-off day <span className="font-semibold">{card.cutoffDay}</span>, next cut-off{" "}
              <span className="font-semibold">{format(fromKey(nextCut), "d MMM yyyy")}</span>
            </>
          ) : (
            "No cut-off day set"
          )}
        </span>
        {editMode && (
          <form
            key={card.cutoffDay ?? "none"}
            className="flex items-center gap-2"
            action={(formData) => {
              startTransition(async () => handleResult(await setCardCutoff(formData)));
            }}
          >
            <input type="hidden" name="cardId" value={card.id} />
            <div className="w-20">
              <Input
                name="day"
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                placeholder="Day"
                defaultValue={card.cutoffDay ?? ""}
                aria-label="Cut-off day of the month"
              />
            </div>
            <Button type="submit" disabled={pending}>
              Save cut-off
            </Button>
          </form>
        )}
      </div>

      {editMode && (
        <form
          ref={formRef}
          className="mt-4 space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
          action={(formData) => {
            startTransition(async () => {
              const result =
                action === "charge" ? await addTransaction(formData) : await addCardPayment(formData);
              handleResult(result);
              if (result.ok) {
                formRef.current?.reset();
                setPayFrom("");
              }
            });
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700">
              {(["charge", "payment"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAction(a)}
                  className={cx(
                    "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                    action === a
                      ? a === "charge"
                        ? "bg-rose-600 text-white"
                        : "bg-emerald-600 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
                  )}
                >
                  {a === "charge" ? "Charge" : "Payment"}
                </button>
              ))}
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {action === "charge"
                ? "A purchase on the card. It counts as spending but your money moves when you pay."
                : "Pay the card down. Pick a vault to take the money from it."}
            </span>
          </div>

          {action === "charge" ? (
            <>
              <input type="hidden" name="type" value="EXPENSE" />
              <input type="hidden" name="account" value={`card:${card.id}`} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[9rem_1fr_9rem_8rem]">
                <div>
                  <Label htmlFor="card-date">Date</Label>
                  <Input id="card-date" name="date" type="date" defaultValue={today} required />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="card-description">Name (optional)</Label>
                  <Input id="card-description" name="description" maxLength={200} placeholder="Purchase" />
                </div>
                <div>
                  <Label htmlFor="card-category">Category</Label>
                  <Select id="card-category" name="category" defaultValue="other_expense">
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji} {c.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <div className="mb-1 flex items-baseline justify-between">
                    <Label htmlFor="card-amount" className="mb-0">
                      Amount
                    </Label>
                    <span className="text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                      Max {formatCents(Math.max(0, available))}
                    </span>
                  </div>
                  <Input
                    id="card-amount"
                    name="amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    max={(Math.max(0, available) / 100).toFixed(2)}
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <input type="hidden" name="cardId" value={card.id} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[9rem_1fr_11rem_8rem]">
                <div>
                  <Label htmlFor="pay-date">Date</Label>
                  <Input id="pay-date" name="date" type="date" defaultValue={today} required />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="pay-description">Name (optional)</Label>
                  <Input
                    id="pay-description"
                    name="description"
                    maxLength={200}
                    placeholder={`Payment · ${card.name}`}
                  />
                </div>
                <AccountPicker
                  id="pay-account"
                  type="EXPENSE"
                  value={payFrom}
                  onChange={setPayFrom}
                  vaults={vaults}
                  cards={[]}
                />
                <div>
                  <Label htmlFor="pay-amount">Amount</Label>
                  <Input
                    id="pay-amount"
                    name="amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    placeholder={owed > 0 ? (owed / 100).toFixed(2) : undefined}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={pending}>
              {action === "charge" ? "Add charge" : "Add payment"}
            </Button>
          </div>
        </form>
      )}

      <div className="mt-4">
        <div className="mb-2 text-xs font-medium text-zinc-500 uppercase dark:text-zinc-400">
          History
        </div>
        {history.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No charges or payments yet. {card.name} is paid up.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {history.map((t) => {
              const isPayment = t.kind === "CARD_PAYMENT";
              const scheduled = t.date > today;
              return (
                <li key={t.id} className={cx("flex items-center gap-3 py-2.5 text-sm", scheduled && "opacity-70")}>
                  <span className="w-14 shrink-0 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                    {format(fromKey(t.date), "d MMM yy")}
                  </span>
                  <span className="w-6 shrink-0 text-center text-base leading-none" aria-hidden>
                    {entryEmoji(t)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate">{t.description}</span>
                      {t.recurringRuleId && <Repeat className="size-3 shrink-0 text-zinc-400" />}
                      {scheduled && (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          scheduled
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {isPayment ? "Payment" : "Charge"}
                      {isPayment && <AccountTag entry={t} vaults={vaults} cards={[]} />}
                    </span>
                  </span>
                  <span
                    className={cx(
                      "font-medium tabular-nums",
                      isPayment ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {isPayment ? "−" : "+"}
                    {formatCents(t.amountCents)}
                  </span>
                  {editMode && (
                    <Button
                      variant="ghost"
                      className="size-8 px-0"
                      disabled={pending}
                      title="Edit"
                      onClick={() => onEditTransaction(t.id)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  )}
                  {editMode && (
                    <Button
                      variant="danger"
                      className="size-8 px-0"
                      disabled={pending}
                      title="Delete"
                      onClick={() =>
                        startTransition(async () => handleResult(await deleteTransaction(t.id)))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
      <div className="text-[11px] font-medium text-zinc-500 uppercase dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-0.5 text-lg">{children}</div>
    </div>
  );
}
