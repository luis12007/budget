"use server";

import { revalidatePath } from "next/cache";
import { decodeAccount, type AccountRef } from "@/lib/accounts";
import { checkPassword, grantEdit, LockedError, requireEdit, revokeEdit } from "@/lib/auth";
import { getCategory } from "@/lib/categories";
import { isDateKey, todayKey } from "@/lib/dates";
import { loadData } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { balanceAt, cardOwedAt, vaultBalancesAt } from "@/lib/projection";
import { buildOccurrences } from "@/lib/recurring";
import type { ActionResult, EntryType, Frequency } from "@/lib/types";

const FAR_FUTURE = "9999-12-31";

function parseCents(raw: FormDataEntryValue | null, { allowNegative = false } = {}): number {
  const value = Number.parseFloat(String(raw ?? "").replace(",", "."));
  if (!Number.isFinite(value)) throw new Error("Amount must be a number");
  if (!allowNegative && value <= 0) throw new Error("Amount must be greater than zero");
  return Math.round(value * 100);
}

function parseType(raw: FormDataEntryValue | null): EntryType {
  if (raw === "INCOME" || raw === "EXPENSE") return raw;
  throw new Error("Invalid entry type");
}

function parseFrequency(raw: FormDataEntryValue | null): Frequency {
  if (raw === "WEEKLY" || raw === "BIWEEKLY" || raw === "MONTHLY" || raw === "YEARLY") return raw;
  throw new Error("Invalid frequency");
}

function parseDate(raw: FormDataEntryValue | null): string {
  const value = String(raw ?? "");
  if (!isDateKey(value)) throw new Error("Invalid date");
  return value;
}

function parseOptionalDate(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim();
  return value ? parseDate(value) : null;
}

function parseCategory(raw: FormDataEntryValue | null, type: EntryType) {
  const category = getCategory(String(raw ?? ""));
  if (!category || category.type !== type) throw new Error("Invalid category");
  return category;
}

function parseDescription(raw: FormDataEntryValue | null, fallback: string): string {
  const value = String(raw ?? "").trim().slice(0, 200);
  return value || fallback;
}

// Resolves the "paid from / added to" selection. Income can only land in a vault; an expense can
// come out of a vault or be charged to a credit card. Nothing selected = not assigned.
async function parseAccount(raw: FormDataEntryValue | null, type: EntryType): Promise<AccountRef> {
  const ref = decodeAccount(String(raw ?? ""));
  if (ref.vaultId) {
    const vault = await prisma.vault.findUnique({ where: { id: ref.vaultId } });
    if (!vault) throw new Error("Vault not found");
  }
  if (ref.cardId) {
    if (type === "INCOME") throw new Error("Income can only be added to a vault");
    const card = await prisma.creditCard.findUnique({ where: { id: ref.cardId } });
    if (!card) throw new Error("Credit card not found");
  }
  return ref;
}

async function requireCard(id: string) {
  const card = await prisma.creditCard.findUnique({ where: { id } });
  if (!card) throw new Error("Credit card not found");
  return card;
}

// Everything owed on a card, including scheduled charges, so the limit check is conservative.
async function cardOwedTotal(cardId: string, excludeId?: string): Promise<number> {
  const rows = (
    await prisma.transaction.findMany({
      where: { cardId },
      select: { id: true, cardId: true, date: true, kind: true, type: true, amountCents: true },
    })
  ).filter((r) => r.id !== excludeId);
  return cardOwedAt(
    cardId,
    rows.map((r) => ({ ...r, kind: r.kind as "ENTRY" | "CARD_PAYMENT", type: r.type as EntryType })),
    FAR_FUTURE,
  );
}

async function assertWithinLimit(cardId: string, amountCents: number, excludeId?: string) {
  const card = await requireCard(cardId);
  const available = card.limitCents - (await cardOwedTotal(cardId, excludeId));
  if (amountCents > available) {
    throw new Error(
      `${card.name} only has ${formatCents(Math.max(0, available))} available of its ${formatCents(card.limitCents)} limit`,
    );
  }
}

async function guarded(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await requireEdit();
    await fn();
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    if (error instanceof LockedError) return { ok: false, error: error.message, locked: true };
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong" };
  }
}

export type UnlockState = { status: "idle" | "error" | "ok" };

export async function unlockEdit(_prev: UnlockState, formData: FormData): Promise<UnlockState> {
  if (!checkPassword(String(formData.get("password") ?? ""))) return { status: "error" };
  await grantEdit();
  revalidatePath("/");
  return { status: "ok" };
}

export async function lockEdit() {
  await revokeEdit();
  revalidatePath("/");
}

export async function addTransaction(formData: FormData) {
  return guarded(async () => {
    const type = parseType(formData.get("type"));
    const category = parseCategory(formData.get("category"), type);
    const amountCents = parseCents(formData.get("amount"));
    const account = await parseAccount(formData.get("account"), type);
    if (account.cardId) await assertWithinLimit(account.cardId, amountCents);

    await prisma.transaction.create({
      data: {
        date: parseDate(formData.get("date")),
        type,
        kind: "ENTRY",
        amountCents,
        description: parseDescription(formData.get("description"), category.label),
        category: category.id,
        vaultId: account.vaultId,
        cardId: account.cardId,
      },
    });
  });
}

// Pays down a credit card. If a vault is chosen the money leaves that vault; otherwise only the
// card balance changes.
export async function addCardPayment(formData: FormData) {
  return guarded(async () => {
    const card = await requireCard(String(formData.get("cardId") ?? ""));
    const amountCents = parseCents(formData.get("amount"));
    const account = await parseAccount(formData.get("account"), "EXPENSE");
    if (account.cardId) throw new Error("A card payment must come from a vault");

    await prisma.transaction.create({
      data: {
        date: parseDate(formData.get("date")),
        type: "EXPENSE",
        kind: "CARD_PAYMENT",
        amountCents,
        description: parseDescription(formData.get("description"), `Payment · ${card.name}`),
        category: null,
        vaultId: account.vaultId,
        cardId: card.id,
      },
    });
  });
}

// Edits a one-off entry or a card payment. Card payments keep their card and only change the source vault.
export async function updateTransaction(formData: FormData) {
  return guarded(async () => {
    const id = String(formData.get("id") ?? "");
    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) throw new Error("Entry not found");
    const date = parseDate(formData.get("date"));
    const amountCents = parseCents(formData.get("amount"));

    if (existing.kind === "CARD_PAYMENT") {
      const card = existing.cardId ? await requireCard(existing.cardId) : null;
      if (!card) throw new Error("Credit card not found");
      const account = await parseAccount(formData.get("account"), "EXPENSE");
      if (account.cardId) throw new Error("A card payment must come from a vault");
      await prisma.transaction.update({
        where: { id },
        data: {
          date,
          amountCents,
          description: parseDescription(formData.get("description"), `Payment · ${card.name}`),
          vaultId: account.vaultId,
        },
      });
      return;
    }

    const type = parseType(formData.get("type"));
    const category = parseCategory(formData.get("category"), type);
    const account = await parseAccount(formData.get("account"), type);
    if (account.cardId) await assertWithinLimit(account.cardId, amountCents, id);

    await prisma.transaction.update({
      where: { id },
      data: {
        date,
        type,
        amountCents,
        description: parseDescription(formData.get("description"), category.label),
        category: category.id,
        vaultId: account.vaultId,
        cardId: account.cardId,
      },
    });
  });
}

// Edits a recurring rule. Future occurrences change; entries already confirmed keep their values.
export async function updateRecurringRule(formData: FormData) {
  return guarded(async () => {
    const id = String(formData.get("id") ?? "");
    const existing = await prisma.recurringRule.findUnique({ where: { id } });
    if (!existing) throw new Error("Recurring rule not found");

    const type = parseType(formData.get("type"));
    const category = parseCategory(formData.get("category"), type);
    const startDate = parseDate(formData.get("startDate"));
    const endDate = parseOptionalDate(formData.get("endDate"));
    if (endDate && endDate < startDate) throw new Error("End date must be after start date");
    const account = await parseAccount(formData.get("account"), type);

    await prisma.recurringRule.update({
      where: { id },
      data: {
        description: parseDescription(formData.get("description"), category.label),
        type,
        amountCents: parseCents(formData.get("amount")),
        frequency: parseFrequency(formData.get("frequency")),
        startDate,
        endDate,
        category: category.id,
        vaultId: account.vaultId,
        cardId: account.cardId,
      },
    });
  });
}

// Sets the statement cut-off day (1-31). An empty value clears it.
export async function setCardCutoff(formData: FormData) {
  return guarded(async () => {
    const card = await requireCard(String(formData.get("cardId") ?? ""));
    const raw = String(formData.get("day") ?? "").trim();
    let cutoffDay: number | null = null;
    if (raw) {
      const day = Number.parseInt(raw, 10);
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        throw new Error("Cut-off day must be between 1 and 31");
      }
      cutoffDay = day;
    }
    await prisma.creditCard.update({ where: { id: card.id }, data: { cutoffDay } });
  });
}

export async function deleteTransaction(id: string) {
  return guarded(async () => {
    await prisma.transaction.delete({ where: { id } });
  });
}

export async function confirmRecurring(ruleId: string, date: string) {
  return guarded(async () => {
    const rule = await prisma.recurringRule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new Error("Recurring rule not found");
    const dateKey = parseDate(date);

    const existing = await prisma.transaction.findFirst({
      where: { recurringRuleId: ruleId, date: dateKey },
    });
    if (existing) return;

    await prisma.transaction.create({
      data: {
        date: dateKey,
        type: rule.type,
        kind: "ENTRY",
        amountCents: rule.amountCents,
        description: rule.description,
        category: rule.category,
        vaultId: rule.vaultId,
        cardId: rule.cardId,
        recurringRuleId: rule.id,
      },
    });
  });
}

// Where every vault stands today once the entries assigned to it since the last real balance
// are applied, plus the money total the user sees as "Money today".
async function projectToday() {
  const today = todayKey();
  const { settings, vaults, transactions, rules } = await loadData();
  const lo = settings.balanceDate < today ? settings.balanceDate : today;
  const hi = settings.balanceDate > today ? settings.balanceDate : today;
  const occurrences = buildOccurrences(transactions, rules, lo, hi, vaults);
  return {
    today,
    vaults,
    balances: vaultBalancesAt(vaults, settings, occurrences, today),
    moneyToday: balanceAt(settings, occurrences, today),
  };
}

// Any vault change means "this is the real money as of today", so projections restart from here.
// Every vault's projected balance becomes its stored balance so none of them jumps back.
function materializeVaults(
  state: Awaited<ReturnType<typeof projectToday>>,
  overrides: Record<string, number> = {},
) {
  return [
    ...state.vaults.map((v) =>
      prisma.vault.update({
        where: { id: v.id },
        data: { balanceCents: overrides[v.id] ?? state.balances.get(v.id) ?? v.balanceCents },
      }),
    ),
    prisma.settings.upsert({
      where: { id: 1 },
      update: { balanceDate: state.today },
      create: { id: 1, balanceDate: state.today },
    }),
  ];
}

export async function adjustVault(formData: FormData) {
  return guarded(async () => {
    const id = String(formData.get("id") ?? "");
    const state = await projectToday();
    const vault = state.vaults.find((v) => v.id === id);
    if (!vault) throw new Error("Vault not found");

    const current = state.balances.get(id) ?? vault.balanceCents;
    const amount = parseCents(formData.get("amount"));
    const mode = formData.get("mode");
    let balanceCents: number;
    if (mode === "add") balanceCents = current + amount;
    else if (mode === "remove") balanceCents = current - amount;
    else if (mode === "set") balanceCents = amount;
    else throw new Error("Invalid operation");

    if (balanceCents < 0) throw new Error(`Not enough money in ${vault.name}`);

    // A vault can never hold more than the money you have today. New money comes in as income.
    if (vault.countsInTotal && state.moneyToday > 0 && balanceCents > state.moneyToday) {
      throw new Error(
        `You have ${formatCents(state.moneyToday)} today, so ${vault.name} can hold at most that. Record an income to add new money.`,
      );
    }

    await prisma.$transaction(materializeVaults(state, { [id]: balanceCents }));
  });
}

export async function setVaultCounts(id: string, countsInTotal: boolean) {
  return guarded(async () => {
    const state = await projectToday();
    if (!state.vaults.some((v) => v.id === id)) throw new Error("Vault not found");
    await prisma.$transaction([
      ...materializeVaults(state),
      prisma.vault.update({ where: { id }, data: { countsInTotal } }),
    ]);
  });
}

export async function updateTrackingStart(formData: FormData) {
  return guarded(async () => {
    const trackingStart = parseDate(formData.get("trackingStart"));
    await prisma.settings.upsert({
      where: { id: 1 },
      update: { trackingStart },
      create: { id: 1, balanceDate: todayKey(), trackingStart },
    });
  });
}

export async function addRecurringRule(formData: FormData) {
  return guarded(async () => {
    const type = parseType(formData.get("type"));
    const category = parseCategory(formData.get("category"), type);
    const startDate = parseDate(formData.get("startDate"));
    const endDate = parseOptionalDate(formData.get("endDate"));
    if (endDate && endDate < startDate) throw new Error("End date must be after start date");
    const account = await parseAccount(formData.get("account"), type);

    await prisma.recurringRule.create({
      data: {
        description: parseDescription(formData.get("description"), category.label),
        type,
        amountCents: parseCents(formData.get("amount")),
        frequency: parseFrequency(formData.get("frequency")),
        startDate,
        endDate,
        category: category.id,
        vaultId: account.vaultId,
        cardId: account.cardId,
      },
    });
  });
}

export async function setRecurringRuleActive(id: string, active: boolean) {
  return guarded(async () => {
    await prisma.recurringRule.update({ where: { id }, data: { active } });
  });
}

export async function deleteRecurringRule(id: string) {
  return guarded(async () => {
    await prisma.recurringRule.delete({ where: { id } });
  });
}
