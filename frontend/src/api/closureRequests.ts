// Admin review of the "other reason" closures salespeople request.
import type { AuthedRequest } from "../auth/EmployeeContext";
import type { ClosureRequest, ClosureRequestList, ClosureRequestStatus } from "../types/api";

export const CLOSURE_REQUEST_PAGE_SIZE = 20;

export const CLOSURE_REQUEST_STATUSES: ClosureRequestStatus[] = ["PENDING", "APPROVED", "REJECTED"];

export const CLOSURE_REQUEST_STATUS_LABELS: Record<ClosureRequestStatus, string> = {
  PENDING: "Waiting for review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function listClosureRequests(
  request: AuthedRequest,
  { status, page }: { status: ClosureRequestStatus; page: number },
  signal?: AbortSignal,
) {
  return request<ClosureRequestList>(`/inquiry-closure-requests?status=${status}&page=${page}&limit=${CLOSURE_REQUEST_PAGE_SIZE}`, { signal });
}

// Approving closes the inquiry; rejecting keeps it in progress. The review note is optional.
export function reviewClosureRequest(request: AuthedRequest, requestId: number, decision: "approve" | "reject", reviewNote: string) {
  return request<{ request: ClosureRequest }>(`/inquiry-closure-requests/${requestId}/${decision}`, {
    method: "PATCH",
    body: reviewNote ? { reviewNote } : {},
  });
}
