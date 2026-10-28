// Admin-only endpoints. The backend enforces the admin role on every one of them.
import type { AuthedRequest } from "../auth/EmployeeContext";
import type {
  AdminCategory,
  AdminCategoryList,
  AdminProduct,
  AdminProductList,
  AdminSummary,
  CatalogStatus,
  CompanySettings,
  Employee,
  ProductBrochure,
  ProductImage,
  ProductUnit,
  ProductVideo,
  UserList,
  UserRole,
} from "../types/api";

export const ADMIN_PAGE_SIZE = 20;

export const CATALOG_STATUSES: CatalogStatus[] = ["ACTIVE", "INACTIVE", "ARCHIVED"];

export const CATALOG_STATUS_LABELS: Record<CatalogStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  SALESPERSON: "Salesperson",
};

function listQuery(page: number, limit: number, filters: Record<string, string | number | undefined>) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return query;
}

// ---- Overview ----

export function getSummary(request: AuthedRequest, signal?: AbortSignal) {
  return request<AdminSummary>("/analytics/summary", { signal });
}

// ---- Staff ----

export function listUsers(
  request: AuthedRequest,
  { page, search, role, status }: { page: number; search?: string; role?: UserRole; status?: Employee["status"] },
  signal?: AbortSignal,
) {
  return request<UserList>(`/users?${listQuery(page, ADMIN_PAGE_SIZE, { search, role, status })}`, { signal });
}

export function getUser(request: AuthedRequest, userId: number, signal?: AbortSignal) {
  return request<Employee>(`/users/${userId}`, { signal });
}

export type NewSalespersonInput = { name: string; email: string; phone: string; password: string };

export function createSalesperson(request: AuthedRequest, body: NewSalespersonInput) {
  return request<Employee>("/users", { method: "POST", body });
}

export function updateUserProfile(request: AuthedRequest, userId: number, body: { name?: string; phone?: string }) {
  return request<Employee>(`/users/${userId}/profile`, { method: "PATCH", body });
}

export function changeUserRole(request: AuthedRequest, userId: number, role: UserRole) {
  return request<Employee>(`/users/${userId}/role`, { method: "PATCH", body: { role } });
}

export function changeUserStatus(request: AuthedRequest, userId: number, status: Employee["status"]) {
  return request<Employee>(`/users/${userId}/status`, { method: "PATCH", body: { status } });
}

// ---- Products ----

export function listAdminProducts(
  request: AuthedRequest,
  { page, status, categoryId, search }: { page: number; status?: CatalogStatus; categoryId?: number; search?: string },
  signal?: AbortSignal,
) {
  return request<AdminProductList>(`/products/admin?${listQuery(page, ADMIN_PAGE_SIZE, { status, categoryId, search })}`, {
    signal,
  });
}

export function getAdminProduct(request: AuthedRequest, productId: number, signal?: AbortSignal) {
  return request<AdminProduct>(`/products/admin/${productId}`, { signal });
}

export type ProductInput = {
  name: string;
  slug: string;
  description: string;
  price: string;
  unit: ProductUnit;
  minimumOrderQuantity: number;
  specifications: Record<string, unknown>;
  status: CatalogStatus;
  categoryId: number;
};

// Create and update return the product without its media; pages reload the admin view.
export function createProduct(request: AuthedRequest, body: ProductInput) {
  return request<{ id: number }>("/products", { method: "POST", body });
}

export function updateProduct(request: AuthedRequest, productId: number, body: Partial<ProductInput>) {
  return request<{ id: number }>(`/products/${productId}`, { method: "PATCH", body });
}

export function addProductImage(request: AuthedRequest, body: { productId: number; imageUrl: string; displayOrder: number }) {
  return request<ProductImage>("/product/images", { method: "POST", body });
}

export function deleteProductImage(request: AuthedRequest, imageId: number) {
  return request<unknown>(`/product/images/${imageId}`, { method: "DELETE" });
}

export function addProductVideo(
  request: AuthedRequest,
  body: { productId: number; youtubeUrl: string; title: string; displayOrder: number },
) {
  return request<ProductVideo>("/product/videos", { method: "POST", body });
}

export function deleteProductVideo(request: AuthedRequest, videoId: number) {
  return request<unknown>(`/product/videos/${videoId}`, { method: "DELETE" });
}

export function addProductBrochure(request: AuthedRequest, body: { productId: number; fileUrl: string; fileName: string }) {
  return request<ProductBrochure>("/product/brochure", { method: "POST", body });
}

export function deleteProductBrochure(request: AuthedRequest, brochureId: number) {
  return request<unknown>(`/product/brochure/${brochureId}`, { method: "DELETE" });
}

// ---- Categories ----

export function listAdminCategories(
  request: AuthedRequest,
  { page, status, search, limit = ADMIN_PAGE_SIZE }: { page: number; status?: CatalogStatus; search?: string; limit?: number },
  signal?: AbortSignal,
) {
  return request<AdminCategoryList>(`/category/admin?${listQuery(page, limit, { status, search })}`, { signal });
}

export function getAdminCategory(request: AuthedRequest, categoryId: number, signal?: AbortSignal) {
  return request<AdminCategory>(`/category/admin/${categoryId}`, { signal });
}

export type CategoryInput = {
  name: string;
  slug: string;
  description: string;
  displayOrder: number;
  status: CatalogStatus;
};

export function createCategory(request: AuthedRequest, body: CategoryInput) {
  return request<{ id: number }>("/category", { method: "POST", body });
}

export function updateCategory(request: AuthedRequest, categoryId: number, body: Partial<CategoryInput>) {
  return request<{ id: number }>(`/category/${categoryId}`, { method: "PATCH", body });
}

// ---- Company settings ----

export type CompanySettingsInput = Omit<CompanySettings, "id" | "createdAt" | "updatedAt">;

export function getCompanySettings(request: AuthedRequest, signal?: AbortSignal) {
  return request<CompanySettings>("/company-settings", { signal });
}

export function createCompanySettings(request: AuthedRequest, body: CompanySettingsInput) {
  return request<CompanySettings>("/company-settings", { method: "POST", body });
}

export function updateCompanySettings(request: AuthedRequest, body: Partial<CompanySettingsInput>) {
  return request<CompanySettings>("/company-settings", { method: "PATCH", body });
}

// ---- Helpers ----

// Lowercase letters, numbers and single hyphens, as the backend requires for slugs.
export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Server field paths arrive as "body.name"; forms key their errors by "name".
export function serverFieldErrors(fieldErrors: { field: string; message: string }[]) {
  return Object.fromEntries(fieldErrors.map((item) => [item.field.replace(/^body\./, ""), item.message]));
}
