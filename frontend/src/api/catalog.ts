import { apiRequest } from "./client";
import type { Category, CategoryList, Product, ProductList } from "../types/api";

export type ProductFilters = {
  page?: number;
  limit?: number;
  categoryId?: number;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
};

function toQuery(filters: ProductFilters) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function listProducts(filters: ProductFilters, signal?: AbortSignal) {
  return apiRequest<ProductList>(`/products${toQuery(filters)}`, { signal });
}

export function getProduct(productId: number, signal?: AbortSignal) {
  return apiRequest<Product>(`/products/${productId}`, { signal });
}

// Active categories in display order. The backend allows at most 100 per page,
// which is far more categories than the catalog has.
export async function listCategories(signal?: AbortSignal): Promise<Category[]> {
  const data = await apiRequest<CategoryList>("/category?limit=100", { signal });

  return [...data.category].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
  );
}
