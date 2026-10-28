import { apiRequest } from "./client";
import type { CreatedInquiry, CustomerInquiryHistory, OtpChallenge } from "../types/api";

// Sends a one-time code to the phone number the customer typed.
export function requestInquiryCode(phoneNumber: string) {
  return apiRequest<OtpChallenge>("/customer-otp/challenges", {
    method: "POST",
    body: { purpose: "INQUIRY_SUBMISSION", phoneNumber },
  });
}

export type NewInquiry = {
  productId: number;
  phoneNumber: string;
  requirement: string;
  challengeId: string;
  code: string;
};

// The code is checked and used up by this request; there is no separate verify step.
export function submitInquiry(inquiry: NewInquiry) {
  return apiRequest<CreatedInquiry>("/inquiries", { method: "POST", body: inquiry });
}

// Sends a one-time code for viewing the enquiries made from this number.
export function requestHistoryCode(phoneNumber: string) {
  return apiRequest<OtpChallenge>("/customer-otp/challenges", {
    method: "POST",
    body: { purpose: "INQUIRY_HISTORY_LOOKUP", phoneNumber },
  });
}

export type HistoryLookup = {
  phoneNumber: string;
  challengeId: string;
  code: string;
};

// Uses up the code: each look at the history needs a new one.
export function lookupInquiryHistory(lookup: HistoryLookup) {
  return apiRequest<CustomerInquiryHistory>("/inquiries/customer/history", { method: "POST", body: lookup });
}
