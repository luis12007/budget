"use client";

import { categoriesFor } from "@/lib/categories";
import type { EntryType } from "@/lib/types";
import { cx } from "./ui";

export function CategoryPicker({
  type,
  value,
  onChange,
}: {
  type: EntryType;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Category" className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
      {categoriesFor(type).map((c) => {
        const selected = c.id === value;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(c.id)}
            className={cx(
              "flex flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-[11px] leading-tight transition-colors",
              selected
                ? "border-zinc-900 bg-zinc-100 font-medium dark:border-zinc-200 dark:bg-zinc-800"
                : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/60",
            )}
          >
            <span className="text-xl leading-none">{c.emoji}</span>
            <span className="w-full truncate text-center">{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}
