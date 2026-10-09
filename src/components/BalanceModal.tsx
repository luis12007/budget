"use client";

import { useTransition } from "react";
import { updateBalance } from "@/app/actions";
import type { Settings } from "@/lib/types";
import { useHandleResult } from "./ActionFeedback";
import { Button, Input, Label, Modal } from "./ui";

export function BalanceModal({ settings, onClose }: { settings: Settings; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const handleResult = useHandleResult();

  return (
    <Modal title="Update current balance" onClose={onClose}>
      <form
        className="space-y-4"
        action={(formData) => {
          startTransition(async () => {
            const result = await updateBalance(formData);
            handleResult(result);
            if (result.ok) onClose();
          });
        }}
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Enter the money you actually have and the date it applies to. Everything else is projected
          from this point using your entries and recurring rules.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="balance">Balance</Label>
            <Input
              id="balance"
              name="balance"
              type="number"
              inputMode="decimal"
              step="0.01"
              defaultValue={(settings.balanceCents / 100).toFixed(2)}
              required
            />
          </div>
          <div>
            <Label htmlFor="balanceDate">As of (end of day)</Label>
            <Input
              id="balanceDate"
              name="balanceDate"
              type="date"
              defaultValue={settings.balanceDate}
              required
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={pending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
