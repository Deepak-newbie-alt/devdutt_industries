// Product form state, conversion to the API body, and validation. Limits follow the
// backend validator and the database columns (price is Decimal(12,2), quantities are Int).
import type { ProductInput } from "../../api/admin";
import { SLUG_PATTERN } from "../../api/admin";
import type { AdminProduct, CatalogStatus, ProductUnit } from "../../types/api";
import { formatSpecValue } from "../../utils/format";
import { rowKey, type FormErrors, type PairRow } from "../quotations/quotationFormState";

export const PRODUCT_LIMITS = {
  name: 200,
  slug: 220,
  description: 1000,
  maxPrice: 9_999_999_999.99,
  maxQuantity: 2_147_483_647,
} as const;

export const UNITS: ProductUnit[] = ["Machine", "Set", "Piece"];

export type ProductFormState = {
  name: string;
  slug: string;
  description: string;
  price: string;
  unit: ProductUnit;
  minimumOrderQuantity: string;
  categoryId: string;
  status: CatalogStatus;
  specs: PairRow[];
};

// Specification values are free-form JSON. Rows the admin doesn't touch keep their
// original value (number, list, ...) instead of being turned into text.
export type OriginalSpecs = Map<string, { label: string; value: unknown }>;

export function emptyProductState(): ProductFormState {
  return {
    name: "",
    slug: "",
    description: "",
    price: "",
    unit: "Machine",
    minimumOrderQuantity: "1",
    categoryId: "",
    status: "ACTIVE",
    specs: [],
  };
}

export function stateFromProduct(product: AdminProduct): { state: ProductFormState; originals: OriginalSpecs } {
  const originals: OriginalSpecs = new Map();
  const specs = Object.entries(product.specifications ?? {}).map(([label, value]) => {
    const row = { key: rowKey(), label, value: formatSpecValue(value) };
    originals.set(row.key, { label, value });
    return row;
  });

  return {
    state: {
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: String(Number(product.price)),
      unit: product.unit,
      minimumOrderQuantity: String(product.minimumOrderQuantity),
      categoryId: String(product.categoryId),
      status: product.status,
      specs,
    },
    originals,
  };
}

export function validateProduct(state: ProductFormState): FormErrors {
  const errors: FormErrors = {};

  if (!state.name.trim()) errors.name = "Enter the product name.";
  if (!state.slug.trim()) errors.slug = "Enter a web address name.";
  else if (!SLUG_PATTERN.test(state.slug.trim())) errors.slug = "Use lowercase letters, numbers and single hyphens only.";
  if (!state.description.trim()) errors.description = "Enter a description.";

  const price = state.price.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(price) || Number(price) <= 0) errors.price = "Enter a price above 0, with at most 2 decimal places.";
  else if (Number(price) > PRODUCT_LIMITS.maxPrice) errors.price = "This price is too large.";

  const quantity = state.minimumOrderQuantity.trim();
  if (!/^\d+$/.test(quantity) || Number(quantity) < 1) errors.minimumOrderQuantity = "Enter a whole number, 1 or more.";
  else if (Number(quantity) > PRODUCT_LIMITS.maxQuantity) errors.minimumOrderQuantity = "This number is too large.";

  if (!state.categoryId) errors.categoryId = "Choose a category.";

  const seen = new Set<string>();
  state.specs.forEach((row, index) => {
    const label = row.label.trim();
    if (!label && !row.value.trim()) return;
    if (!label) errors[`specs.${index}.label`] = "Enter a heading, or remove this row.";
    else if (seen.has(label.toLowerCase())) errors[`specs.${index}.label`] = "This heading is already used.";
    if (label && !row.value.trim()) errors[`specs.${index}.value`] = "Enter a value, or remove this row.";
    seen.add(label.toLowerCase());
  });

  return errors;
}

export function toProductInput(state: ProductFormState, originals: OriginalSpecs): ProductInput {
  const specifications: Record<string, unknown> = {};

  for (const row of state.specs) {
    const label = row.label.trim();
    if (!label) continue;
    const original = originals.get(row.key);
    const unchanged = original && original.label === label && formatSpecValue(original.value) === row.value;
    specifications[label] = unchanged ? original.value : row.value.trim();
  }

  return {
    name: state.name.trim(),
    slug: state.slug.trim(),
    description: state.description.trim(),
    price: state.price.trim(),
    unit: state.unit,
    minimumOrderQuantity: Number(state.minimumOrderQuantity.trim()),
    categoryId: Number(state.categoryId),
    status: state.status,
    specifications,
  };
}

// Media links must be web addresses (http or https).
export function isWebUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
