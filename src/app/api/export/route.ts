import { NextResponse } from "next/server";
import { isEditUnlocked } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

// Only available in edit mode, because the export contains every entry and card.
export async function GET(request: Request) {
  if (!(await isEditUnlocked())) {
    return NextResponse.json({ error: "Unlock edit mode to export data" }, { status: 401 });
  }

  const [settings, vaults, cards, transactions, recurringRules, highlights] = await Promise.all([
    prisma.settings.findMany(),
    prisma.vault.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.creditCard.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.transaction.findMany({ orderBy: { date: "asc" } }),
    prisma.recurringRule.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.highlight.findMany({ orderBy: { date: "asc" } }),
  ]);

  const tables: Record<string, Row[]> = {
    settings,
    vaults,
    cards,
    transactions,
    recurringRules,
    highlights,
  };

  const params = new URL(request.url).searchParams;
  if (params.get("format") === "csv") {
    const table = params.get("table") ?? "transactions";
    const rows = tables[table];
    if (!rows) return NextResponse.json({ error: `Unknown table ${table}` }, { status: 400 });
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${table}.csv"`,
      },
    });
  }

  return NextResponse.json(
    { exportedAt: new Date().toISOString(), ...tables },
    { headers: { "Content-Disposition": 'attachment; filename="budget-export.json"' } },
  );
}

function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const text = value instanceof Date ? value.toISOString() : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))].join("\r\n");
}
