import { CATALOG_STATUS_LABELS } from "../../api/admin";
import type { CatalogStatus, Employee } from "../../types/api";

export function CatalogStatusBadge({ status }: { status: CatalogStatus }) {
  return <span className={`badge badge--catalog-${status.toLowerCase()}`}>{CATALOG_STATUS_LABELS[status]}</span>;
}

export function UserStatusBadge({ status }: { status: Employee["status"] }) {
  return <span className={`badge badge--user-${status.toLowerCase()}`}>{status === "ACTIVE" ? "Active" : "Inactive"}</span>;
}
