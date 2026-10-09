"use client";

import { useTransition } from "react";
import { updateTrackingStart } from "@/app/actions";
import { useHandleResult } from "./ActionFeedback";
import { Button, Input, Label, Modal } from "./ui";

export function TrackingStartModal({
  trackingStart,
  onClose,
}: {
  trackingStart: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const handleResult = useHandleResult();

  return (
    <Modal title="Tracking start date" onClose={onClose}>
      <form
        className="space-y-4"
        action={(formData) => {
          startTransition(async () => {
            const result = await updateTrackingStart(formData);
            handleResult(result);
            if (result.ok) onClose();
          });
        }}
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Days before this date are shown as not tracked and are excluded from totals and
          projections.
        </p>
        <div>
          <Label htmlFor="trackingStart">Start counting from</Label>
          <Input id="trackingStart" name="trackingStart" type="date" defaultValue={trackingStart} required />
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
