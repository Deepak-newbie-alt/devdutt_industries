// Quotation form state, conversion to the API body, and validation. Limits follow the
// backend validator and, where tighter, the database columns (so saving never fails with a 500).
import type { QuotationInput } from "../../api/staffQuotations";
import type { ProductUnit, QuotationRevision, StaffInquiry } from "../../types/api";
import { formatSpecValue } from "../../utils/format";
import { toBasisPoints, toPaise, type TaxMode } from "../../utils/money";

export const LIMITS = {
  buyerName: 50,
  companyName: 50,
  gstNumber: 50,
  email: 255,
  productName: 200,
  itemName: 100,
  itemDescription: 1000,
} as const;

export type PairRow = { key: string; label: string; value: string };

export type ItemRow = {
  key: string;
  name: string;
  description: string;
  quantity: string;
  unit: ProductUnit;
  unitPrice: string;
};

export type QuotationFormState = {
  buyerName: string;
  companyName: string;
  address: string;
  gstNumber: string;
  mobileNumber: string;
  email: string;
  productName: string;
  specs: PairRow[];
  terms: PairRow[];
  validUntil: string;
  taxMode: TaxMode;
  cgstRate: string;
  sgstRate: string;
  igstRate: string;
  items: ItemRow[];
};

// Field path -> message, e.g. "items.0.unitPrice".
export type FormErrors = Record<string, string>;

let nextKey = 0;
export const rowKey = () => `row-${++nextKey}`;

export const emptyItem = (unit: ProductUnit = "Machine"): ItemRow => ({
  key: rowKey(),
  name: "",
  description: "",
  quantity: "1",
  unit,
  unitPrice: "",
});

export const emptyPair = (label = ""): PairRow => ({ key: rowKey(), label, value: "" });

const toPairs = (record: Record<string, unknown>) =>
  Object.entries(record).map(([label, value]) => ({ key: rowKey(), label, value: formatSpecValue(value) }));

// Today in India, as YYYY-MM-DD (the backend compares validity dates in India time).
export function todayInIndia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

// A new quotation, pre-filled from the enquiry and its machine.
export function stateFromInquiry(inquiry: StaffInquiry, defaultTerms: string | null): QuotationFormState {
  const product = inquiry.product;

  return {
    buyerName: "",
    companyName: "",
    address: "",
    gstNumber: "",
    mobileNumber: inquiry.phoneNumber,
    email: "",
    productName: product.name,
    specs: Object.keys(product.specifications).length > 0 ? toPairs(product.specifications) : [emptyPair()],
    // Company default terms if set up; otherwise empty rows with common headings to fill in.
    terms: defaultTerms
      ? [{ key: rowKey(), label: "Terms and conditions", value: defaultTerms }]
      : [emptyPair("Payment"), emptyPair("Delivery"), emptyPair("Warranty")],
    validUntil: addDays(todayInIndia(), 30),
    taxMode: "intra",
    cgstRate: "",
    sgstRate: "",
    igstRate: "",
    items: [
      {
        key: rowKey(),
        name: product.name.slice(0, LIMITS.itemName),
        description: "",
        quantity: String(product.minimumOrderQuantity),
        unit: product.unit,
        unitPrice: product.price,
      },
    ],
  };
}

// An existing draft, for editing.
export function stateFromRevision(revision: QuotationRevision): QuotationFormState {
  const taxMode: TaxMode = revision.igstRate !== null ? "inter" : revision.cgstRate !== null ? "intra" : "none";

  return {
    buyerName: revision.buyerName,
    companyName: revision.companyName ?? "",
    address: revision.address,
    gstNumber: revision.gstNumber,
    mobileNumber: revision.mobileNumber,
    email: revision.email ?? "",
    productName: revision.productName,
    specs: toPairs(revision.machineSpecifications),
    terms: toPairs(revision.terms),
    validUntil: revision.validUntil.slice(0, 10),
    taxMode,
    cgstRate: revision.cgstRate ?? "",
    sgstRate: revision.sgstRate ?? "",
    igstRate: revision.igstRate ?? "",
    items: [...revision.items]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((item) => ({
        key: rowKey(),
        name: item.name,
        description: item.description ?? "",
        quantity: String(item.quantity),
        unit: item.unit,
        unitPrice: item.unitPrice,
      })),
  };
}

const filledPairs = (rows: PairRow[]) => rows.filter((row) => row.label.trim() || row.value.trim());

function pairsToRecord(rows: PairRow[]) {
  return Object.fromEntries(filledPairs(rows).map((row) => [row.label.trim(), row.value.trim()]));
}

export function toInput(state: QuotationFormState): QuotationInput {
  const optional = (value: string) => (value.trim() ? value.trim() : undefined);

  return {
    buyerName: state.buyerName.trim(),
    companyName: optional(state.companyName),
    address: state.address.trim(),
    gstNumber: state.gstNumber.trim(),
    mobileNumber: state.mobileNumber.trim(),
    email: optional(state.email),
    productName: state.productName.trim(),
    machineSpecifications: pairsToRecord(state.specs),
    terms: pairsToRecord(state.terms),
    validUntil: state.validUntil,
    ...(state.taxMode === "intra" ? { cgstRate: state.cgstRate.trim(), sgstRate: state.sgstRate.trim() } : {}),
    ...(state.taxMode === "inter" ? { igstRate: state.igstRate.trim() } : {}),
    items: state.items.map((item, index) => ({
      name: item.name.trim(),
      description: optional(item.description),
      quantity: Number(item.quantity.trim()),
      unit: item.unit,
      unitPrice: item.unitPrice.trim(),
      displayOrder: index,
    })),
  };
}

function validatePairs(rows: PairRow[], field: "specs" | "terms", errors: FormErrors, what: string) {
  const filled = filledPairs(rows);

  if (filled.length === 0) {
    errors[field] = `Add at least one ${what}.`;
    return;
  }

  const seen = new Set<string>();
  rows.forEach((row, index) => {
    const label = row.label.trim();
    if (!label && !row.value.trim()) return;
    if (!label) errors[`${field}.${index}.label`] = "Add a heading.";
    else if (!row.value.trim()) errors[`${field}.${index}.value`] = "Add a value or remove this row.";
    else if (seen.has(label.toLowerCase())) errors[`${field}.${index}.label`] = "This heading is used twice.";
    seen.add(label.toLowerCase());
  });
}

export function validate(state: QuotationFormState): FormErrors {
  const errors: FormErrors = {};
  const required = (field: keyof QuotationFormState, value: string, label: string, max?: number) => {
    if (!value.trim()) errors[field] = `${label} is required.`;
    else if (max && value.trim().length > max) errors[field] = `${label} must be ${max} characters or fewer.`;
  };

  required("buyerName", state.buyerName, "Buyer name", LIMITS.buyerName);
  if (state.companyName.trim().length > LIMITS.companyName) errors.companyName = `Company name must be ${LIMITS.companyName} characters or fewer.`;
  required("address", state.address, "Address");
  required("gstNumber", state.gstNumber, "GST number", LIMITS.gstNumber);
  const mobile = state.mobileNumber.trim();
  if (mobile.length < 10 || mobile.length > 15) errors.mobileNumber = "Enter a mobile number of 10 to 15 characters.";
  const email = state.email.trim();
  if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > LIMITS.email)) errors.email = "Enter a valid email address, or leave it empty.";
  required("productName", state.productName, "Machine name", LIMITS.productName);

  validatePairs(state.specs, "specs", errors, "specification");
  validatePairs(state.terms, "terms", errors, "term");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(state.validUntil)) errors.validUntil = "Choose a date.";
  else if (state.validUntil < todayInIndia()) errors.validUntil = "The validity date can't be in the past.";

  const rate = (field: "cgstRate" | "sgstRate" | "igstRate", value: string) => {
    if (toBasisPoints(value) === null) errors[field] = "Enter a rate from 0 to 100 (up to 2 decimals).";
  };
  if (state.taxMode === "intra") {
    rate("cgstRate", state.cgstRate);
    rate("sgstRate", state.sgstRate);
  } else if (state.taxMode === "inter") {
    rate("igstRate", state.igstRate);
  }

  if (state.items.length === 0) errors.items = "Add at least one item.";
  state.items.forEach((item, index) => {
    const at = (field: string) => `items.${index}.${field}`;
    if (!item.name.trim()) errors[at("name")] = "Item name is required.";
    else if (item.name.trim().length > LIMITS.itemName) errors[at("name")] = `Keep it to ${LIMITS.itemName} characters.`;
    if (item.description.trim().length > LIMITS.itemDescription) errors[at("description")] = `Keep it to ${LIMITS.itemDescription} characters.`;
    if (!/^\d+$/.test(item.quantity.trim()) || Number(item.quantity) < 1) errors[at("quantity")] = "Whole number, 1 or more.";
    const price = toPaise(item.unitPrice);
    if (price === null || price <= 0n) errors[at("unitPrice")] = "Price above 0, up to 2 decimals.";
  });

  return errors;
}

// Backend field paths ("body.items.0.unitPrice") -> form paths ("items.0.unitPrice").
export function serverFieldPath(field: string) {
  return field.replace(/^body\./, "").replace(/^machineSpecifications/, "specs");
}
