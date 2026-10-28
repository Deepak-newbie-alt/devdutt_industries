// Employee inquiry endpoints. Each takes the signed-in employee's request function;
// the backend decides what each role may see and do.
import type { AuthedRequest } from "../auth/EmployeeContext";
import type { InquiryActivity, InquiryClosureReason, InquiryStatus, StaffInquiry } from "../types/api";

export const INQUIRY_PAGE_SIZE = 20;

// The backend returns a plain array (no total): a full page means there may be more.
export function listInquiries(
  request: AuthedRequest,
  { status, page }: { status: InquiryStatus; page: number },
  signal?: AbortSignal,
) {
  return request<StaffInquiry[]>(`/inquiries?status=${status}&page=${page}&limit=${INQUIRY_PAGE_SIZE}`, { signal });
}

export function getInquiry(request: AuthedRequest, inquiryId: number, signal?: AbortSignal) {
  return request<StaffInquiry>(`/inquiries/${inquiryId}`, { signal });
}

export function getInquiryActivities(request: AuthedRequest, inquiryId: number, signal?: AbortSignal) {
  return request<InquiryActivity[]>(`/inquiries/${inquiryId}/activities`, { signal });
}

export function claimInquiry(request: AuthedRequest, inquiryId: number) {
  return request<{ inquiry: StaffInquiry }>(`/inquiries/${inquiryId}/claim`, { method: "PATCH" });
}

export type ActivityKind = "contact" | "note";

// "contact" records that the customer was contacted; "note" is an internal note.
export function addInquiryActivity(request: AuthedRequest, inquiryId: number, kind: ActivityKind, note: string) {
  const path = kind === "contact" ? "contact" : "activities";
  return request<InquiryActivity>(`/inquiries/${inquiryId}/${path}`, { method: "POST", body: { note } });
}

// Same values and order as the backend's InquiryClosureReason.
export const CLOSURE_REASON_LABELS: Record<InquiryClosureReason, string> = {
  DUPLICATE: "Duplicate enquiry",
  CUSTOMER_UNREACHABLE: "Customer not responding",
  CUSTOMER_NOT_INTERESTED: "Customer no longer needs it",
  NOT_OUR_PRODUCT: "Requirement we can't supply",
  INVALID_INQUIRY: "Spam or invalid details",
  OTHER: "Other",
};

// The note is optional, except for OTHER, where the backend requires it.
export function closeInquiry(request: AuthedRequest, inquiryId: number, reason: InquiryClosureReason, note: string) {
  return request<{ inquiry: StaffInquiry }>(`/inquiries/${inquiryId}/close`, {
    method: "PATCH",
    body: note ? { reason, note } : { reason },
  });
}
