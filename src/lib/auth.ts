import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const EDIT_COOKIE = "budget_edit";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

function password(): string {
  return process.env.EDIT_PASSWORD ?? "";
}

function sessionToken(): string {
  return createHmac("sha256", password()).update("edit-session").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length > 0 && bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function checkPassword(candidate: string): boolean {
  return safeEqual(password(), candidate);
}

export async function isEditUnlocked(): Promise<boolean> {
  const value = (await cookies()).get(EDIT_COOKIE)?.value;
  return !!value && safeEqual(value, sessionToken());
}

export async function grantEdit(): Promise<void> {
  (await cookies()).set(EDIT_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

export async function revokeEdit(): Promise<void> {
  (await cookies()).delete(EDIT_COOKIE);
}

export class LockedError extends Error {
  constructor() {
    super("Edit mode is locked. Enter the password to continue.");
    this.name = "LockedError";
  }
}

export async function requireEdit(): Promise<void> {
  if (!(await isEditUnlocked())) throw new LockedError();
}
