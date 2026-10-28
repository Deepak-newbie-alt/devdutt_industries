import type { AuthedRequest } from "../auth/EmployeeContext";
import type { Order, OrderActivity, OrderList, OrderStatus } from "../types/api";

export const ORDER_PAGE_SIZE = 20;

// Admins get every order; a salesperson only orders from their own quotations.
export function listOrders(
  request: AuthedRequest,
  { page, status, search }: { page: number; status?: OrderStatus; search?: string },
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({ page: String(page), limit: String(ORDER_PAGE_SIZE) });
  if (status) query.set("status", status);
  if (search) query.set("search", search);
  return request<OrderList>(`/orders?${query}`, { signal });
}

export function getOrder(request: AuthedRequest, orderId: number, signal?: AbortSignal) {
  return request<Order>(`/orders/${orderId}`, { signal });
}

// Admins can read any order's history; a salesperson only their own.
export function getOrderActivities(request: AuthedRequest, orderId: number, signal?: AbortSignal) {
  return request<OrderActivity[]>(`/orders/${orderId}/activities`, { signal });
}

export function createOrder(request: AuthedRequest, quotationRevisionId: number) {
  return request<Order>("/orders", { method: "POST", body: { quotationRevisionId } });
}

export function changeOrderStatus(request: AuthedRequest, orderId: number, status: OrderStatus) {
  return request<Order>(`/orders/${orderId}/status`, { method: "PATCH", body: { status } });
}

export function addOrderNote(request: AuthedRequest, orderId: number, note: string) {
  return request<OrderActivity>(`/orders/${orderId}/add-note`, { method: "POST", body: { note } });
}

// The transitions the backend allows from each status.
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  CONFIRMED: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["READY"],
  READY: ["DISPATCHED"],
  DISPATCHED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  CONFIRMED: "Confirmed",
  IN_PRODUCTION: "In production",
  READY: "Ready",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};
