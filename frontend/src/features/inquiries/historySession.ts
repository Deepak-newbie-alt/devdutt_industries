import { useOutletContext } from "react-router";
import type { CustomerInquiryHistory } from "../../types/api";

// A verified look at one phone's enquiries. Held in memory by the /my-inquiries layout only:
// never saved in the browser, so a refresh or new tab means verifying again.
export type HistorySession = {
  phone: string;
  history: CustomerInquiryHistory;
  accessToken: string;
  // When the read token stops working (ms since epoch).
  expiresAt: number;
};

export type HistoryOutletContext = {
  session: HistorySession | null;
  // Shown on the verify form after a session ends because its access expired.
  notice: string | null;
  start: (history: CustomerInquiryHistory, phone: string) => void;
  end: (reason: "expired" | "signed-out") => void;
};

export const EXPIRED_NOTICE =
  "For your security, access to your enquiries ends after 15 minutes. Verify your number again to continue.";

export function useHistorySession() {
  return useOutletContext<HistoryOutletContext>();
}
