"use client";

import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { addRecurringRule, deleteRecurringRule, setRecurringRuleActive } from "@/app/actions";
import { categoriesFor, categoryEmoji, getCategory } from "@/lib/categories";
import { fromKey, todayKey } from "@/lib/dates";
import type { EntryType, RecurringRule } from "@/lib/types";
import { useHandleResult } from "./ActionFeedback";
import { CategoryPicker } from "./CategoryPicker";
import { Amount, Button, Input, Label, Modal, Select, Switch, cx } from "./ui";

const FREQUENCY_LABEL: Record<RecurringRule["frequency"], string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

export function RecurringModal({
  rules,
  editMode,
  onClose,
}: {
  rules: RecurringRule[];
  editMode: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const handleResult = useHandleResult();
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<EntryType>("EXPENSE");
  const [category, setCategory] = useState(categoriesFor("EXPENSE")[0].id);

  const changeType = (next: EntryType) => {
    setType(next);
    setCategory(categoriesFor(next)[0].id);
  };

  return (
    <Modal title="Recurring payments & income" onClose={onClose} wide>
      {rules.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No recurring rules yet.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className={cx("flex items-center gap-3 py-2.5 text-sm", !rule.active && "opacity-50")}
            >
              <span className="w-6 shrink-0 text-center text-base leading-none" aria-hidden>
                {categoryEmoji(rule.category, rule.type)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{rule.description}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {describeSchedule(rule)}
                </div>
              </div>
              <Amount cents={rule.amountCents} type={rule.type} className="font-medium" />
              {editMode && (
                <>
                  <Switch
                    checked={rule.active}
                    label=""
                    onChange={(active) =>
                      startTransition(async () =>
                        handleResult(await setRecurringRuleActive(rule.id, active)),
                      )
                    }
                  />
                  <Button
                    variant="danger"
                    className="size-8 px-0"
                    disabled={pending}
                    title="Delete rule"
                    onClick={() => {
                      if (confirm(`Delete "${rule.description}"? Confirmed entries are kept.`)) {
                        startTransition(async () =>
                          handleResult(await deleteRecurringRule(rule.id)),
                        );
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
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
              const result = await addRecurringRule(formData);
              handleResult(result);
              if (result.ok) formRef.current?.reset();
            });
          }}
        >
          <input type="hidden" name="category" value={category} />
          <div className="text-sm font-medium">Add recurring rule</div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[7rem_1fr_8rem]">
            <div>
              <Label htmlFor="r-type">Type</Label>
              <Select
                id="r-type"
                name="type"
                value={type}
                onChange={(e) => changeType(e.target.value as EntryType)}
              >
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="r-description">Name (optional)</Label>
              <Input
                id="r-description"
                name="description"
                maxLength={200}
                placeholder={getCategory(category)?.label}
              />
            </div>
            <div>
              <Label htmlFor="r-amount">Amount</Label>
              <Input
                id="r-amount"
                name="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
              />
            </div>
          </div>

          <CategoryPicker type={type} value={category} onChange={setCategory} />

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="r-frequency">Repeats</Label>
              <Select id="r-frequency" name="frequency" defaultValue="MONTHLY">
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="r-start">First date</Label>
              <Input id="r-start" name="startDate" type="date" defaultValue={todayKey()} required />
            </div>
            <div>
              <Label htmlFor="r-end">Ends (optional)</Label>
              <Input id="r-end" name="endDate" type="date" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={pending}>
              Add rule
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function describeSchedule(rule: RecurringRule): string {
  const start = fromKey(rule.startDate);
  let when: string;
  switch (rule.frequency) {
    case "WEEKLY":
      when = `every ${format(start, "EEEE")}`;
      break;
    case "MONTHLY":
      when = `on the ${format(start, "do")}`;
      break;
    case "YEARLY":
      when = `every ${format(start, "d MMMM")}`;
      break;
  }
  const range = rule.endDate
    ? `from ${format(start, "d MMM yyyy")} to ${format(fromKey(rule.endDate), "d MMM yyyy")}`
    : `since ${format(start, "d MMM yyyy")}`;
  return `${FREQUENCY_LABEL[rule.frequency]} ${when} · ${range}`;
}
