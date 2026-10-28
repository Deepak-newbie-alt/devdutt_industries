import type { OrderStatus, QuotationRevisionStatus } from "../../types/api";
import { ORDER_STATUS_LABELS } from "../../api/staffOrders";

const REVISION_LABELS: Record<QuotationRevisionStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  REVISION_REQUESTED: "Changes requested",
  SUPERSEDED: "Superseded",
  ACCEPTED: "Accepted",
  REJECTED: "Declined",
  EXPIRED: "Expired",
};

export function RevisionStatusBadge({ status }: { status: QuotationRevisionStatus }) {
  return <span className={`badge badge--rev-${status.toLowerCase().replace("_", "-")}`}>{REVISION_LABELS[status]}</span>;
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge badge--order-${status.toLowerCase().replace("_", "-")}`}>{ORDER_STATUS_LABELS[status]}</span>;
}
