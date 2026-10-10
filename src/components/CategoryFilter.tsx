"use client";

import { Filter } from "lucide-react";
import { useState } from "react";
import { filterLegend } from "@/lib/categories";
import { Button, Switch, cx } from "./ui";

// Dropdown that shows or hides calendar entries by category. Visual only: hidden entries still count.
export function CategoryFilter({
  hidden,
  onToggle,
  onSetAll,
}: {
  hidden: Set<string>;
  onToggle: (key: string) => void;
  onSetAll: (hide: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const legend = filterLegend();

  return (
    <div className="relative">
      <Button onClick={() => setOpen((o) => !o)} aria-expanded={open} className={cx(hidden.size > 0 && "text-amber-700 dark:text-amber-300")}>
        <Filter className="size-4" />
        Filter{hidden.size > 0 ? ` (${hidden.size} hidden)` : ""}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onMouseDown={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between px-2 pb-2 text-xs">
              <button type="button" onClick={() => onSetAll(false)} className="font-medium text-zinc-700 hover:underline dark:text-zinc-300">
                Show all
              </button>
              <button type="button" onClick={() => onSetAll(true)} className="font-medium text-zinc-700 hover:underline dark:text-zinc-300">
                Hide all
              </button>
            </div>
            <ul className="max-h-96 overflow-y-auto">
              {legend.map((item) => (
                <li key={item.key} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                  <span className="w-6 shrink-0 text-center text-lg leading-none" aria-hidden>
                    {item.emoji}
                  </span>
                  <span className="flex-1 text-sm">{item.label}</span>
                  <Switch checked={!hidden.has(item.key)} label="" onChange={() => onToggle(item.key)} />
                </li>
              ))}
            </ul>
            <p className="px-2 pt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              Hidden entries are only hidden from the calendar. Totals still include them.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
