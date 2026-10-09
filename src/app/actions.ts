"use server";

import { revalidatePath } from "next/cache";
import { checkPassword, grantEdit, LockedError, requireEdit, revokeEdit } from "@/lib/auth";
import { getCategory } from "@/lib/categories";
import { isDateKey, todayKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import type { ActionResult, EntryType, Frequency } from "@/lib/types";

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
  if (raw === "WEEKLY" || raw === "MONTHLY" || raw === "YEARLY") return raw;
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
    await prisma.transaction.create({
      data: {
        date: parseDate(formData.get("date")),
        type,
        amountCents: parseCents(formData.get("amount")),
        description: parseDescription(formData.get("description"), category.label),
        category: category.id,
      },
    });
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
        amountCents: rule.amountCents,
        description: rule.description,
        category: rule.category,
        recurringRuleId: rule.id,
      },
    });
  });
}

// Any vault change means "this is the real money as of today", so projections restart from here.
function markBalanceAsOfToday() {
  const today = todayKey();
  return prisma.settings.upsert({
    where: { id: 1 },
    update: { balanceDate: today },
    create: { id: 1, balanceDate: today },
  });
}

export async function adjustVault(formData: FormData) {
  return guarded(async () => {
    const id = String(formData.get("id") ?? "");
    const vault = await prisma.vault.findUnique({ where: { id } });
    if (!vault) throw new Error("Vault not found");

    const amount = parseCents(formData.get("amount"));
    const mode = formData.get("mode");
    let balanceCents: number;
    if (mode === "add") balanceCents = vault.balanceCents + amount;
    else if (mode === "remove") balanceCents = vault.balanceCents - amount;
    else if (mode === "set") balanceCents = amount;
    else throw new Error("Invalid operation");

    if (balanceCents < 0) throw new Error(`Not enough money in ${vault.name}`);

    await prisma.$transaction([
      prisma.vault.update({ where: { id }, data: { balanceCents } }),
      markBalanceAsOfToday(),
    ]);
  });
}

export async function setVaultCounts(id: string, countsInTotal: boolean) {
  return guarded(async () => {
    await prisma.$transaction([
      prisma.vault.update({ where: { id }, data: { countsInTotal } }),
      markBalanceAsOfToday(),
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

    await prisma.recurringRule.create({
      data: {
        description: parseDescription(formData.get("description"), category.label),
        type,
        amountCents: parseCents(formData.get("amount")),
        frequency: parseFrequency(formData.get("frequency")),
        startDate,
        endDate,
        category: category.id,
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
