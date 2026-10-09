"use client";

import { useState, useTransition } from "react";
import { adjustVault } from "@/app/actions";
import { formatCents } from "@/lib/money";
import type { Vault } from "@/lib/types";
import { useHandleResult } from "./ActionFeedback";
import { Button, Input, Label, Modal, cx } from "./ui";

type Mode = "add" | "remove" | "set";

const MODES: { value: Mode; label: string; verb: string }[] = [
  { value: "add", label: "Add", verb: "Add to" },
  { value: "remove", label: "Remove", verb: "Remove from" },
  { value: "set", label: "Set exact", verb: "Set" },
];

export function VaultModal({ vault, onClose }: { vault: Vault; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const handleResult = useHandleResult();
  const [mode, setMode] = useState<Mode>("add");

  return (
    <Modal
      title={
        <span className="inline-flex items-center gap-2">
          <span aria-hidden>{vault.emoji}</span> {vault.name}
        </span>
      }
      onClose={onClose}
    >
      <form
        className="space-y-4"
        action={(formData) => {
          startTransition(async () => {
            const result = await adjustVault(formData);
            handleResult(result);
            if (result.ok) onClose();
          });
        }}
      >
        <input type="hidden" name="id" value={vault.id} />
        <input type="hidden" name="mode" value={mode} />

        <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
          <div className="text-[11px] font-medium text-zinc-500 uppercase dark:text-zinc-400">
            Current balance
          </div>
          <div className="text-xl font-semibold">{formatCents(vault.balanceCents)}</div>
        </div>

        <div className="inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={cx(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                mode === m.value
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div>
          <Label htmlFor="vault-amount">Amount</Label>
          <Input
            id="vault-amount"
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
            autoFocus
          />
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Updating a vault records today as the date of your real balance. Projections for the
          following days start from the new total.
        </p>

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {MODES.find((m) => m.value === mode)?.verb} {vault.name}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
