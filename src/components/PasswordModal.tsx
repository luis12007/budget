"use client";

import { Lock } from "lucide-react";
import { useActionState, useEffect } from "react";
import { unlockEdit, type UnlockState } from "@/app/actions";
import { Button, Input, Label, Modal } from "./ui";

const initialState: UnlockState = { status: "idle" };

export function PasswordModal({
  onClose,
  onUnlocked,
}: {
  onClose: () => void;
  onUnlocked: () => void;
}) {
  const [state, action, pending] = useActionState(unlockEdit, initialState);

  useEffect(() => {
    if (state.status === "ok") onUnlocked();
  }, [state, onUnlocked]);

  return (
    <Modal
      title={
        <span className="inline-flex items-center gap-2">
          <Lock className="size-4" /> Unlock edit mode
        </span>
      }
      onClose={onClose}
    >
      <form action={action} className="space-y-4">
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            aria-invalid={state.status === "error"}
          />
          {state.status === "error" && (
            <p className="mt-1.5 text-sm text-rose-600 dark:text-rose-400">Incorrect password.</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={pending}>
            Unlock
          </Button>
        </div>
      </form>
    </Modal>
  );
}
