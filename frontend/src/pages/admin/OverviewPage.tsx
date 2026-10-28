import { Link } from "react-router";
import { CATALOG_STATUS_LABELS, CATALOG_STATUSES, getSummary } from "../../api/admin";
import { ORDER_STATUS_LABELS } from "../../api/staffOrders";
import { useEmployee } from "../../auth/EmployeeContext";
import { LoadError } from "../../components/ui/LoadError";
import { LoadingState } from "../../components/ui/LoadingState";
import { useApiQuery } from "../../hooks/useApiQuery";
import type { InquiryStatus, OrderStatus, QuotationRevisionStatus } from "../../types/api";

const INQUIRY_LABELS: Record<InquiryStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  CLOSED: "Closed",
};

const REVISION_LABELS: Record<QuotationRevisionStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  REVISION_REQUESTED: "Changes requested",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  SUPERSEDED: "Superseded",
};

type Tile = { label: string; count: number; to?: string };

function TileGroup({ id, title, note, tiles }: { id: string; title: string; note?: string; tiles: Tile[] }) {
  return (
    <section className="panel" aria-labelledby={id}>
      <h2 id={id} className="panel__title">
        {title}
      </h2>
      {note && <p className="muted">{note}</p>}
      <ul className="stat-grid">
        {tiles.map((tile) => (
          <li key={tile.label} className="stat">
            {tile.to ? (
              <Link to={tile.to} className="stat__link">
                <span className={tile.count === 0 ? "stat__count stat__count--zero" : "stat__count"}>{tile.count.toLocaleString("en-IN")}</span>
                <span className="stat__label">{tile.label}</span>
              </Link>
            ) : (
              <div className="stat__box">
                <span className={tile.count === 0 ? "stat__count stat__count--zero" : "stat__count"}>{tile.count.toLocaleString("en-IN")}</span>
                <span className="stat__label">{tile.label}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Live record counts from the database. Nothing here is estimated or projected.
export function OverviewPage() {
  const { request } = useEmployee();
  const summary = useApiQuery((signal) => getSummary(request, signal), []);

  return (
    <div className="container page-section">
      <title>Overview | Devdutt Industries Staff</title>
      <header className="page-header">
        <h1>Overview</h1>
        <p className="muted">Current counts from the database.</p>
      </header>

      {summary.status === "loading" && <LoadingState label="Loading the overview" />}
      {summary.status === "error" && <LoadError title="The overview couldn't be loaded" error={summary.error} onRetry={summary.reload} />}

      {summary.status === "success" && (
        <div className="overview">
          <TileGroup
            id="inquiries-heading"
            title="Inquiries"
            tiles={(Object.keys(INQUIRY_LABELS) as InquiryStatus[]).map((status) => ({
              label: INQUIRY_LABELS[status],
              count: summary.data.inquiries[status],
              to: `/app/inquiries?status=${status}`,
            }))}
          />
          <TileGroup
            id="quotations-heading"
            title="Quotations"
            note={`${summary.data.quotations.total.toLocaleString("en-IN")} quotations. Each revision is counted by its status.`}
            tiles={(Object.keys(REVISION_LABELS) as QuotationRevisionStatus[]).map((status) => ({
              label: REVISION_LABELS[status],
              count: summary.data.quotations.revisionsByStatus[status],
            }))}
          />
          <TileGroup
            id="orders-heading"
            title="Orders"
            tiles={(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((status) => ({
              label: ORDER_STATUS_LABELS[status],
              count: summary.data.orders[status],
              to: `/app/orders?status=${status}`,
            }))}
          />
          <TileGroup
            id="staff-heading"
            title="Staff"
            tiles={summary.data.users.flatMap(({ role, byStatus }) =>
              (["ACTIVE", "INACTIVE"] as const).map((status) => ({
                label: `${status === "ACTIVE" ? "Active" : "Inactive"} ${role === "ADMIN" ? "admins" : "salespeople"}`,
                count: byStatus[status],
                to: `/app/staff?role=${role}&status=${status}`,
              })),
            )}
          />
          <TileGroup
            id="catalog-heading"
            title="Catalog"
            tiles={[
              ...CATALOG_STATUSES.map((status) => ({
                label: `${CATALOG_STATUS_LABELS[status]} products`,
                count: summary.data.products[status],
                to: `/app/products?status=${status}`,
              })),
              ...CATALOG_STATUSES.map((status) => ({
                label: `${CATALOG_STATUS_LABELS[status]} categories`,
                count: summary.data.categories[status],
                to: `/app/categories?status=${status}`,
              })),
            ]}
          />
        </div>
      )}
    </div>
  );
}
