// Salesperson quotation endpoints. Ownership and status rules are enforced by the backend.
import type { AuthedFileRequest, AuthedRequest } from "../auth/EmployeeContext";
import type { ProductUnit, QuotationRevision } from "../types/api";

// Body of POST /quotations/:inquiryId and PUT /quotations/:revisionId.
export type QuotationInput = {
  buyerName: string;
  companyName?: string;
  address: string;
  gstNumber: string;
  mobileNumber: string;
  email?: string;
  productName: string;
  machineSpecifications: Record<string, string>;
  terms: Record<string, string>;
  // YYYY-MM-DD, today or later (India time).
  validUntil: string;
  cgstRate?: string;
  sgstRate?: string;
  igstRate?: string;
  items: {
    name: string;
    description?: string;
    quantity: number;
    unit: ProductUnit;
    unitPrice: string;
    displayOrder: number;
  }[];
};

export function createQuotation(request: AuthedRequest, inquiryId: number, input: QuotationInput) {
  return request<{ id: number; quotationNumber: string }>(`/quotations/${inquiryId}`, { method: "POST", body: input });
}

export function editRevision(request: AuthedRequest, revisionId: number, input: QuotationInput) {
  return request<QuotationRevision>(`/quotations/${revisionId}`, { method: "PUT", body: input });
}

export function getRevisions(request: AuthedRequest, quotationId: number, signal?: AbortSignal) {
  return request<QuotationRevision[]>(`/quotations/${quotationId}`, { signal });
}

// Starts the next draft after the customer asked for changes.
export function createNextRevision(request: AuthedRequest, quotationId: number) {
  return request<QuotationRevision>(`/quotations/${quotationId}/revisions`, { method: "POST" });
}

// Issues the PDF, marks the revision SENT and returns the customer link (shown once).
export function sendRevision(request: AuthedRequest, revisionId: number) {
  return request<QuotationRevision & { customerLink: string }>(`/quotations/revisions/${revisionId}/send-quotation`, {
    method: "PATCH",
  });
}

// A new customer link; the previous one stops working.
export function reissueCustomerLink(request: AuthedRequest, revisionId: number) {
  return request<{ revisionId: number; customerLink: string }>(`/quotations/revisions/${revisionId}/customer-link`, {
    method: "POST",
  });
}

export function previewDraftPdf(requestFile: AuthedFileRequest, revisionId: number) {
  return requestFile(`/quotations/revisions/${revisionId}`, { method: "POST" });
}

export function downloadIssuedPdf(requestFile: AuthedFileRequest, revisionId: number) {
  return requestFile(`/quotations/revisions/${revisionId}/document`);
}
