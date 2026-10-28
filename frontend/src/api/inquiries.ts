import { apiRequest } from "./client";
import type { CreatedInquiry, OtpChallenge } from "../types/api";

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
