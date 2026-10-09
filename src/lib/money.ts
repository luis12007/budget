const currency = process.env.NEXT_PUBLIC_CURRENCY ?? "USD";

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency,
});

const compactFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency,
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

export function formatCompactCents(cents: number): string {
  return compactFormatter.format(cents / 100);
}

export function formatSignedCents(cents: number): string {
  if (cents === 0) return formatter.format(0);
  return `${cents > 0 ? "+" : "−"}${formatter.format(Math.abs(cents) / 100)}`;
}
