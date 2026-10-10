import type { CreditCard, Vault } from "./types";

// Where money comes from / goes to. At most one of the two is set.
export interface AccountRef {
  vaultId: string | null;
  cardId: string | null;
}

export const NO_ACCOUNT: AccountRef = { vaultId: null, cardId: null };

// Encodes an account for a <select> value: "", "vault:<id>" or "card:<id>".
export function encodeAccount(ref: AccountRef): string {
  if (ref.cardId) return `card:${ref.cardId}`;
  if (ref.vaultId) return `vault:${ref.vaultId}`;
  return "";
}

export function decodeAccount(value: string | null | undefined): AccountRef {
  const raw = String(value ?? "").trim();
  if (raw.startsWith("vault:")) return { vaultId: raw.slice("vault:".length), cardId: null };
  if (raw.startsWith("card:")) return { vaultId: null, cardId: raw.slice("card:".length) };
  return NO_ACCOUNT;
}

export interface AccountInfo {
  kind: "vault" | "card";
  id: string;
  name: string;
  emoji: string;
}

export function describeAccount(
  ref: AccountRef,
  vaults: Vault[],
  cards: CreditCard[],
): AccountInfo | null {
  if (ref.cardId) {
    const card = cards.find((c) => c.id === ref.cardId);
    return card ? { kind: "card", id: card.id, name: card.name, emoji: card.emoji } : null;
  }
  if (ref.vaultId) {
    const vault = vaults.find((v) => v.id === ref.vaultId);
    return vault ? { kind: "vault", id: vault.id, name: vault.name, emoji: vault.emoji } : null;
  }
  return null;
}
