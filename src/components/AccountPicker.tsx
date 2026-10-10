"use client";

import type { CreditCard, EntryType, Vault } from "@/lib/types";
import { Label, Select } from "./ui";

// "Paid from" / "Added to" selector. Expenses can also be charged to a credit card.
export function AccountPicker({
  id,
  type,
  value,
  onChange,
  vaults,
  cards,
  className,
}: {
  id: string;
  type: EntryType;
  value: string;
  onChange: (value: string) => void;
  vaults: Vault[];
  cards: CreditCard[];
  className?: string;
}) {
  const isExpense = type === "EXPENSE";
  return (
    <div className={className}>
      <Label htmlFor={id}>{isExpense ? "Paid from" : "Added to"}</Label>
      <Select id={id} name="account" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Not assigned</option>
        <optgroup label="Vaults">
          {vaults.map((v) => (
            <option key={v.id} value={`vault:${v.id}`}>
              {v.emoji} {v.name}
            </option>
          ))}
        </optgroup>
        {isExpense && (
          <optgroup label="Credit cards">
            {cards.map((c) => (
              <option key={c.id} value={`card:${c.id}`}>
                {c.emoji} {c.name}
              </option>
            ))}
          </optgroup>
        )}
      </Select>
    </div>
  );
}

// Small inline badge naming the account an entry touches.
export function AccountTag({
  entry,
  vaults,
  cards,
}: {
  entry: { kind: "ENTRY" | "CARD_PAYMENT"; vaultId: string | null; cardId: string | null };
  vaults: Vault[];
  cards: CreditCard[];
}) {
  const vault = entry.vaultId ? vaults.find((v) => v.id === entry.vaultId) : undefined;
  const card = entry.cardId ? cards.find((c) => c.id === entry.cardId) : undefined;

  let text: string | null = null;
  if (entry.kind === "CARD_PAYMENT") {
    text = vault ? `from ${vault.emoji} ${vault.name}` : "source not selected";
  } else if (card) {
    text = `on ${card.emoji} ${card.name}`;
  } else if (vault) {
    text = `${vault.emoji} ${vault.name}`;
  }
  if (!text) return null;

  return (
    <span className="inline-flex shrink-0 items-center rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
      {text}
    </span>
  );
}
