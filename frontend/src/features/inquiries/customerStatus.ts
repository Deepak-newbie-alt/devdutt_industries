import type { CustomerInquiry, CustomerQuotationRevision } from "../../types/api";
import { formatDateOnly } from "../../utils/format";

// Customer wording for where an enquiry stands.
export const INQUIRY_STATUS: Record<CustomerInquiry["status"], { label: string; badge: string }> = {
  OPEN: { label: "Received", badge: "badge--open" },
  IN_PROGRESS: { label: "In progress", badge: "badge--in-progress" },
  CLOSED: { label: "Closed", badge: "badge--closed" },
};

type QuotationState = Pick<CustomerQuotationRevision, "status" | "canRespond" | "validUntil">;

// A sent version's badge; a sent one past its date reads as expired, as on the quotation link page.
export function revisionBadge(revision: QuotationState): { label: string; className: string } {
  switch (revision.status) {
    case "SENT":
      return revision.canRespond
        ? { label: "Awaiting your response", className: "badge--rev-sent" }
        : { label: "Expired", className: "badge--rev-expired" };
    case "REVISION_REQUESTED":
      return { label: "Changes requested", className: "badge--rev-revision-requested" };
    case "SUPERSEDED":
      return { label: "Replaced", className: "badge--rev-superseded" };
    case "ACCEPTED":
      return { label: "Accepted", className: "badge--rev-accepted" };
    case "REJECTED":
      return { label: "Declined", className: "badge--rev-rejected" };
    case "EXPIRED":
      return { label: "Expired", className: "badge--rev-expired" };
  }
}

// Same wording as the quotation link page. The link itself isn't stored, so it can't be shown here.
export function quotationSummary(quotation: QuotationState) {
  const validUntil = formatDateOnly(quotation.validUntil);

  switch (quotation.status) {
    case "SENT":
      return quotation.canRespond
        ? `Awaiting your response. Valid until ${validUntil}. Use the link our team sent you to respond.`
        : `Expired on ${validUntil}.`;
    case "REVISION_REQUESTED":
      return "You asked for changes. Our team will send you a revised quotation.";
    case "SUPERSEDED":
      return "Our team is preparing a revised quotation.";
    case "ACCEPTED":
      return "You accepted this quotation.";
    case "REJECTED":
      return "You declined this quotation.";
    case "EXPIRED":
      return `Expired on ${validUntil}.`;
  }
}

// List cards are brief; the detail page shows how to reach us.
export const LOST_LINK_HINT = "Can't find the link? Open the details for ways to reach us.";
