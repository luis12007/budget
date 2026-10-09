"use client";

import {
  addDays,
  addMonths,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { lockEdit } from "@/app/actions";
import { monthPrefix, todayKey, toKey } from "@/lib/dates";
import { balanceAt, groupByDate, summarize } from "@/lib/projection";
import { buildOccurrences } from "@/lib/recurring";
import type { ActionResult, RecurringRule, Settings, Transaction } from "@/lib/types";
import { ActionResultProvider } from "./ActionFeedback";
import { BalanceModal } from "./BalanceModal";
import { DayModal } from "./DayModal";
import { ForecastView } from "./forecast/ForecastView";
import { Header, type ViewMode } from "./Header";
import { MonthCalendar } from "./MonthCalendar";
import { PasswordModal } from "./PasswordModal";
import { RecurringModal } from "./RecurringModal";
import { SidePanel } from "./SidePanel";
import { IconButton } from "./ui";
import { YearView } from "./YearView";

export function BudgetApp({
  settings,
  transactions,
  rules,
  canEdit,
}: {
  settings: Settings;
  transactions: Transaction[];
  rules: RecurringRule[];
  canEdit: boolean;
}) {
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [modal, setModal] = useState<"balance" | "recurring" | "password" | null>(null);
  const [editMode, setEditMode] = useState(canEdit);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => setEditMode(canEdit), [canEdit]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleResult = useCallback((result: ActionResult) => {
    if (result.ok) return;
    if (result.locked) {
      setEditMode(false);
      setSelectedDay(null);
      setModal("password");
    }
    setError(result.error);
  }, []);

  const handleEditMode = useCallback(
    (enabled: boolean) => {
      if (!enabled) {
        setEditMode(false);
        startTransition(() => lockEdit());
      } else if (canEdit) {
        setEditMode(true);
      } else {
        setModal("password");
      }
    },
    [canEdit, startTransition],
  );

  const handleUnlocked = useCallback(() => {
    setEditMode(true);
    setModal(null);
  }, []);

  const today = todayKey();

  const range = useMemo(() => {
    const start = view === "year" ? startOfYear(cursor) : startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = view === "year" ? endOfYear(cursor) : endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    const upcomingEnd = toKey(addDays(new Date(), 30));
    return {
      start,
      end,
      from: [toKey(start), settings.balanceDate, today].sort()[0],
      to: [toKey(end), settings.balanceDate, upcomingEnd].sort().at(-1)!,
    };
  }, [view, cursor, settings.balanceDate, today]);

  const occurrences = useMemo(
    () => buildOccurrences(transactions, rules, range.from, range.to),
    [transactions, rules, range.from, range.to],
  );

  const occurrencesByDate = useMemo(() => groupByDate(occurrences), [occurrences]);

  const balanceByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const day of eachDayOfInterval({ start: range.start, end: range.end })) {
      const key = toKey(day);
      map.set(key, balanceAt(settings, occurrences, key));
    }
    return map;
  }, [range.start, range.end, settings, occurrences]);

  const period = useMemo(() => {
    const isYear = view === "year";
    const prefix = isYear ? format(cursor, "yyyy") : monthPrefix(cursor);
    const entries = occurrences.filter((o) => o.date.startsWith(prefix));
    const periodStart = isYear ? startOfYear(cursor) : startOfMonth(cursor);
    const periodEnd = isYear ? endOfYear(cursor) : endOfMonth(cursor);

    let lowest: { date: string; balance: number } | null = null;
    for (const day of eachDayOfInterval({ start: periodStart, end: periodEnd })) {
      const key = toKey(day);
      const balance = balanceByDate.get(key) ?? balanceAt(settings, occurrences, key);
      if (!lowest || balance < lowest.balance) lowest = { date: key, balance };
    }

    return {
      label: format(cursor, isYear ? "yyyy" : "MMMM yyyy"),
      summary: summarize(entries),
      endBalance: balanceAt(settings, occurrences, toKey(periodEnd)),
      lowest,
    };
  }, [view, cursor, occurrences, balanceByDate, settings]);

  const upcoming = useMemo(
    () => occurrences.filter((o) => o.date >= today).slice(0, 6),
    [occurrences, today],
  );

  const todayBalance = balanceAt(settings, occurrences, today);

  const step = (direction: 1 | -1) =>
    setCursor((c) => (view === "year" ? addYears(c, direction) : addMonths(c, direction)));

  const selectedEntries = selectedDay ? (occurrencesByDate.get(selectedDay) ?? []) : [];

  return (
    <ActionResultProvider value={handleResult}>
    <div className="flex min-h-screen flex-col">
      <Header
        cursor={cursor}
        view={view}
        editMode={editMode}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onToday={() => setCursor(startOfMonth(new Date()))}
        onViewChange={setView}
        onEditModeChange={handleEditMode}
      />

      {view === "forecast" ? (
        <main className="flex-1 p-4">
          <ForecastView settings={settings} transactions={transactions} rules={rules} today={today} />
        </main>
      ) : (
        <main className="flex flex-1 flex-col gap-4 p-4 lg:flex-row">
          <section className="min-h-[70vh] flex-1 lg:w-[70%]">
            {view === "month" ? (
              <MonthCalendar
                cursor={cursor}
                today={today}
                occurrencesByDate={occurrencesByDate}
                balanceByDate={balanceByDate}
                onSelectDay={setSelectedDay}
              />
            ) : (
              <YearView
                cursor={cursor}
                today={today}
                settings={settings}
                occurrences={occurrences}
                onSelectMonth={(month) => {
                  setCursor(startOfMonth(month));
                  setView("month");
                }}
              />
            )}
          </section>

          <div className="lg:w-[30%] lg:max-w-sm">
            <SidePanel
              settings={settings}
              todayBalance={todayBalance}
              periodLabel={period.label}
              summary={period.summary}
              endBalance={period.endBalance}
              lowest={period.lowest}
              upcoming={upcoming}
              editMode={editMode}
              onEditBalance={() => setModal("balance")}
              onManageRecurring={() => setModal("recurring")}
              onSelectDay={setSelectedDay}
            />
          </div>
        </main>
      )}

      {selectedDay && (
        <DayModal
          dateKey={selectedDay}
          entries={selectedEntries}
          balance={balanceByDate.get(selectedDay) ?? balanceAt(settings, occurrences, selectedDay)}
          editMode={editMode}
          onClose={() => setSelectedDay(null)}
        />
      )}
      {modal === "balance" && <BalanceModal settings={settings} onClose={() => setModal(null)} />}
      {modal === "recurring" && (
        <RecurringModal rules={rules} editMode={editMode} onClose={() => setModal(null)} />
      )}
      {modal === "password" && (
        <PasswordModal onClose={() => setModal(null)} onUnlocked={handleUnlocked} />
      )}

      {error && (
        <div
          role="alert"
          className="fixed bottom-4 left-1/2 z-[60] flex max-w-md -translate-x-1/2 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 py-2 pr-1 pl-4 text-sm text-rose-800 shadow-lg dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
        >
          <span>{error}</span>
          <IconButton label="Dismiss" onClick={() => setError(null)} className="size-8">
            <X className="size-4" />
          </IconButton>
        </div>
      )}
    </div>
    </ActionResultProvider>
  );
}
