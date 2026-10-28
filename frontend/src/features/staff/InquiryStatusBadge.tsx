import type { InquiryStatus } from "../../types/api";

const LABELS: Record<InquiryStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  CLOSED: "Closed",
};

export function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  return <span className={`badge badge--${status.toLowerCase().replace("_", "-")}`}>{LABELS[status]}</span>;
}
