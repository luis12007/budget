"use client";

import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { addHighlight, deleteHighlight } from "@/app/actions";
import { categoryEmoji, entryEmoji } from "@/lib/categories";
import { fromKey, todayKey } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import type { Highlight, RecurringRule, Transaction } from "@/lib/types";
import { useHandleResult } from "../ActionFeedback";
import { Amount, Button, Card, Input, Label, Modal, Select } from "../ui";

export function Highlights({
  highlights,
  transactions,
  rules,
  editMode,
}: {
  highlights: Highlight[];
  transactions: Transaction[];
  rules: RecurringRule[];
  editMode: boolean;
}) {
  const transactionById = new Map(transactions.map((t) => [t.id, t]));
  const ruleById = new Map(rules.map((r) => [r.id, r]));
  const [adding, setAdding] = useState(false);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Highlights</h2>
        {editMode && (
          <Button className="h-8 px-2.5" onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            Add
          </Button>
        )}
      </div>

      {editMode && adding && (
        <Modal title="Add highlight" onClose={() => setAdding(false)}>
          <HighlightForm transactions={transactions} rules={rules} onDone={() => setAdding(false)} />
        </Modal>
      )}

      {highlights.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No highlights yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {highlights.map((h) => (
            <HighlightCard
              key={h.id}
              highlight={h}
              transaction={h.transactionId ? transactionById.get(h.transactionId) : undefined}
              rule={h.recurringRuleId ? ruleById.get(h.recurringRuleId) : undefined}
              editMode={editMode}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function HighlightCard({
  highlight,
  transaction,
  rule,
  editMode,
}: {
  highlight: Highlight;
  transaction: Transaction | undefined;
  rule: RecurringRule | undefined;
  editMode: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const handleResult = useHandleResult();
  const date = fromKey(highlight.date);

  const linked = transaction
    ? {
        emoji: entryEmoji(transaction),
        label: transaction.description,
        type: transaction.type,
        cents: transaction.amountCents,
      }
    : rule
      ? {
          emoji: categoryEmoji(rule.category, rule.type),
          label: rule.description,
          type: rule.type,
          cents: rule.amountCents,
        }
      : null;
  const linkWasRemoved = Boolean(highlight.transactionId || highlight.recurringRuleId) && !linked;

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-4xl font-semibold tracking-tight tabular-nums">{format(date, "d MMM")}</div>
          <div className="text-xs text-zinc-500 uppercase dark:text-zinc-400">{format(date, "yyyy · EEEE")}</div>
        </div>
        {editMode && (
          <Button
            variant="danger"
            className="size-8 px-0"
            disabled={pending}
            title="Delete highlight"
            onClick={() => startTransition(async () => handleResult(await deleteHighlight(highlight.id)))}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      <p className="text-base leading-snug">{highlight.description}</p>

      {linked && (
        <div className="mt-auto flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800/60">
          <span aria-hidden>{linked.emoji}</span>
          <span className="min-w-0 flex-1 truncate">{linked.label}</span>
          <Amount cents={linked.cents} type={linked.type} className="font-medium" />
        </div>
      )}
      {linkWasRemoved && <p className="text-xs text-zinc-500 dark:text-zinc-400">Linked entry was removed.</p>}
    </Card>
  );
}

function HighlightForm({
  transactions,
  rules,
  onDone,
}: {
  transactions: Transaction[];
  rules: RecurringRule[];
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const handleResult = useHandleResult();
  const formRef = useRef<HTMLFormElement>(null);
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <form
      ref={formRef}
      className="grid gap-3 rounded-xl border border-zinc-200 p-4 sm:grid-cols-[10rem_1fr] dark:border-zinc-800"
      action={(formData) => {
        startTransition(async () => {
          const result = await addHighlight(formData);
          handleResult(result);
          if (result.ok) {
            formRef.current?.reset();
            onDone();
          }
        });
      }}
    >
      <div>
        <Label htmlFor="h-date">Date</Label>
        <Input id="h-date" name="date" type="date" defaultValue={todayKey()} required />
      </div>
      <div>
        <Label htmlFor="h-description">Highlight</Label>
        <Input
          id="h-description"
          name="description"
          maxLength={300}
          placeholder="What do I need to do for this date?"
          required
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="h-link">Linked income or expense (optional)</Label>
        <Select id="h-link" name="link" defaultValue="">
          <option value="">No link</option>
          <optgroup label="Entries">
            {sorted.map((t) => (
              <option key={t.id} value={`t:${t.id}`}>
                {t.date} · {entryEmoji(t)} {t.description} · {t.type === "INCOME" ? "+" : "−"}
                {formatCents(t.amountCents)}
              </option>
            ))}
          </optgroup>
          <optgroup label="Recurring">
            {rules.map((r) => (
              <option key={r.id} value={`r:${r.id}`}>
                {categoryEmoji(r.category, r.type)} {r.description} · {r.type === "INCOME" ? "+" : "−"}
                {formatCents(r.amountCents)}
              </option>
            ))}
          </optgroup>
        </Select>
      </div>
      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" variant="primary" disabled={pending}>
          Add highlight
        </Button>
      </div>
    </form>
  );
}
