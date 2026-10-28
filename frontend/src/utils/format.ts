import type { ProductUnit } from "../types/api";

const wholeRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const rupeesAndPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// "185000" -> "₹1,85,000"; "6500.50" -> "₹6,500.50". Prices arrive as decimal strings.
export function formatPrice(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value;
  }

  return Number.isInteger(amount) ? wholeRupees.format(amount) : rupeesAndPaise.format(amount);
}

const unitNames: Record<ProductUnit, [singular: string, plural: string]> = {
  Piece: ["piece", "pieces"],
  Set: ["set", "sets"],
  Machine: ["machine", "machines"],
};

export function formatUnit(unit: ProductUnit, quantity = 1) {
  const [singular, plural] = unitNames[unit];
  return quantity === 1 ? singular : plural;
}

// Specification values are free-form JSON; show them as readable text.
export function formatSpecValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (Array.isArray(value)) {
    return value.map(formatSpecValue).join(", ");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, inner]) => `${key}: ${formatSpecValue(inner)}`)
      .join("; ");
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

const dateOnly = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
  // Date-only values arrive as midnight UTC; format in UTC so the day doesn't shift.
  timeZone: "UTC",
});

// "2026-11-30T00:00:00.000Z" -> "30 November 2026"
export function formatDateOnly(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateOnly.format(date);
}

const dateTime = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

// "2026-10-28T01:22:35.724Z" -> "28 Oct 2026, 6:52 am" (India time)
export function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTime.format(date);
}
