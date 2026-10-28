// Exact money arithmetic in paise (BigInt), matching the backend: amounts have at most
// 2 decimal places and tax is rounded half-up to the paisa (Prisma Decimal default).

const AMOUNT = /^\d+(\.\d{1,2})?$/;

// "185000" -> 18500000n; "6500.5" -> 650050n; anything else -> null.
export function toPaise(value: string): bigint | null {
  const text = value.trim();

  if (!AMOUNT.test(text)) {
    return null;
  }

  const [rupees = "0", paise = ""] = text.split(".");
  return BigInt(rupees) * 100n + BigInt(paise.padEnd(2, "0"));
}

// Tax rate as hundredths of a percent: "9" -> 900n, "2.5" -> 250n. Null if invalid or above 100%.
export function toBasisPoints(rate: string): bigint | null {
  const value = toPaise(rate);
  return value !== null && value <= 10000n ? value : null;
}

// Rounds n / d half-up, for non-negative values.
function divideHalfUp(n: bigint, d: bigint) {
  return (n * 2n + d) / (2n * d);
}

// 18500050n -> "185000.50", in the decimal-string form the API uses.
export function paiseToAmount(paise: bigint) {
  const rupees = paise / 100n;
  const rest = (paise % 100n).toString().padStart(2, "0");
  return `${rupees}.${rest}`;
}

export type TaxMode = "intra" | "inter" | "none";

export type TotalsInput = {
  items: { quantity: string; unitPrice: string }[];
  taxMode: TaxMode;
  cgstRate: string;
  sgstRate: string;
  igstRate: string;
};

export type Totals = {
  taxable: bigint;
  cgst: bigint | null;
  sgst: bigint | null;
  igst: bigint | null;
  grandTotal: bigint;
};

// Same calculation as QuotationService on the backend. Returns null while any
// quantity, price or rate is incomplete, so a half-typed form shows no total.
export function calculateTotals(input: TotalsInput): Totals | null {
  let taxable = 0n;

  for (const item of input.items) {
    const quantity = /^\d+$/.test(item.quantity.trim()) ? BigInt(item.quantity.trim()) : null;
    const price = toPaise(item.unitPrice);

    if (quantity === null || quantity <= 0n || price === null) {
      return null;
    }

    taxable += quantity * price;
  }

  const taxOn = (rate: string) => {
    const basisPoints = toBasisPoints(rate);
    return basisPoints === null ? undefined : divideHalfUp(taxable * basisPoints, 10000n);
  };

  let cgst: bigint | null = null;
  let sgst: bigint | null = null;
  let igst: bigint | null = null;

  if (input.taxMode === "intra") {
    const c = taxOn(input.cgstRate);
    const s = taxOn(input.sgstRate);
    if (c === undefined || s === undefined) return null;
    cgst = c;
    sgst = s;
  } else if (input.taxMode === "inter") {
    const i = taxOn(input.igstRate);
    if (i === undefined) return null;
    igst = i;
  }

  return { taxable, cgst, sgst, igst, grandTotal: taxable + (cgst ?? 0n) + (sgst ?? 0n) + (igst ?? 0n) };
}
