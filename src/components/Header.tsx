"use client";

import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Button, IconButton, Switch, cx } from "./ui";

export type ViewMode = "month" | "year" | "forecast";

const VIEWS: { value: ViewMode; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "forecast", label: "Forecast" },
];

export function Header({
  cursor,
  view,
  editMode,
  onPrev,
  onNext,
  onToday,
  onViewChange,
  onEditModeChange,
  filterMenu,
  actions,
}: {
  cursor: Date;
  view: ViewMode;
  editMode: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: ViewMode) => void;
  onEditModeChange: (enabled: boolean) => void;
  filterMenu?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 font-semibold">
        <Wallet className="size-5" />
        <span className="hidden sm:inline">Budget</span>
      </div>

      {view === "forecast" ? (
        <h1 className="text-lg font-semibold">Forecast</h1>
      ) : (
        <div className="flex items-center gap-1">
          <Button onClick={onToday}>Today</Button>
          <IconButton label={view === "month" ? "Previous month" : "Previous year"} onClick={onPrev}>
            <ChevronLeft className="size-4" />
          </IconButton>
          <IconButton label={view === "month" ? "Next month" : "Next year"} onClick={onNext}>
            <ChevronRight className="size-4" />
          </IconButton>
          <h1 className="ml-1 text-base font-semibold tabular-nums sm:text-lg">
            {format(cursor, view === "month" ? "MMMM yyyy" : "yyyy")}
          </h1>
        </div>
      )}

      <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-4">
        {actions}
        {filterMenu}
        <div role="tablist" className="inline-flex max-w-full overflow-x-auto rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              role="tab"
              aria-selected={view === v.value}
              onClick={() => onViewChange(v.value)}
              className={cx(
                "rounded-md px-2.5 py-1 text-sm font-medium whitespace-nowrap transition-colors sm:px-3",
                view === v.value
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        <Switch checked={editMode} onChange={onEditModeChange} label="Edit mode" />
        <ThemeToggle />
      </div>
    </header>
  );
}
