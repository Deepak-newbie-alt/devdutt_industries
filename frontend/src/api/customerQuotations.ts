// Customer side of a quotation: everything is authorised by the link token plus an OTP.
// The token always travels in a request body, never in a URL.
import { apiRequest } from "./client";
import type { CustomerQuotation, OtpChallenge } from "../types/api";

export type CustomerAction = "accept" | "reject" | "request-revision";

const purposeFor: Record<CustomerAction, string> = {
  accept: "QUOTATION_ACCEPT",
  reject: "QUOTATION_REJECT",
  "request-revision": "QUOTATION_REQUEST_REVISION",
};

export function lookupQuotation(token: string, signal?: AbortSignal) {
  return apiRequest<CustomerQuotation>("/quotations/customer/lookup", {
    method: "POST",
    body: { token },
    signal,
  });
}

// The code goes to the phone number on the original enquiry; the customer never enters it here.
export function requestQuotationCode(token: string, action: CustomerAction) {
  return apiRequest<OtpChallenge>("/customer-otp/challenges", {
    method: "POST",
    body: { purpose: purposeFor[action], token },
  });
}

export function respondToQuotation(
  revisionId: number,
  action: CustomerAction,
  body: { token: string; challengeId: string; code: string },
) {
  return apiRequest<unknown>(`/quotations/revisions/${revisionId}/${action}`, { method: "PATCH", body });
}
