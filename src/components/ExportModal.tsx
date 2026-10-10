"use client";

import { useState } from "react";
import { Button, Modal } from "./ui";

const TABLES: { key: string; label: string }[] = [
  { key: "transactions", label: "Entries" },
  { key: "recurringRules", label: "Recurring rules" },
  { key: "highlights", label: "Highlights" },
  { key: "vaults", label: "Vaults" },
  { key: "cards", label: "Credit cards" },
];

const LINK =
  "inline-flex h-9 items-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";

export function ExportModal({ onClose }: { onClose: () => void }) {
  const [raw, setRaw] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRaw = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/export?format=json", { cache: "no-store" });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      setRaw(JSON.stringify(await res.json(), null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!raw) return;
    await navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Modal title="Export data" onClose={onClose} wide>
      <div className="space-y-5 text-sm">
        <section>
          <div className="mb-2 text-xs font-medium text-zinc-500 uppercase dark:text-zinc-400">Download</div>
          <div className="flex flex-wrap gap-2">
            <a href="/api/export?format=json" download="budget-export.json" className={LINK}>
              Everything (JSON)
            </a>
            {TABLES.map((t) => (
              <a
                key={t.key}
                href={`/api/export?format=csv&table=${t.key}`}
                download={`${t.key}.csv`}
                className={LINK}
              >
                {t.label} (CSV)
              </a>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase dark:text-zinc-400">Raw data</span>
            {raw ? (
              <Button onClick={copy}>{copied ? "Copied" : "Copy"}</Button>
            ) : (
              <Button onClick={loadRaw} disabled={loading}>
                {loading ? "Loading…" : "View raw data"}
              </Button>
            )}
          </div>
          {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
          {raw && (
            <pre className="max-h-96 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-950">{raw}</pre>
          )}
        </section>
      </div>
    </Modal>
  );
}
