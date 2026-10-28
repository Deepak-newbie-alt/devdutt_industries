import type { ReactNode } from "react";
import type { QuotationRevision } from "../../types/api";
import { formatDateOnly, formatDateTime, formatPrice } from "../../utils/format";
import { RevisionStatusBadge } from "./RevisionStatusBadge";

type RevisionCardProps = {
  revision: QuotationRevision;
  latest: boolean;
  children?: ReactNode;
};

function TaxRow({ label, rate, amount }: { label: string; rate: string | null; amount: string | null }) {
  if (rate === null || amount === null) return null;
  return (
    <div>
      <dt>
        {label} ({rate}%)
      </dt>
      <dd>{formatPrice(amount)}</dd>
    </div>
  );
}

// One revision: who it's for, the items and totals. Actions are passed in as children.
export function RevisionCard({ revision, latest, children }: RevisionCardProps) {
  const items = [...revision.items].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <article className={latest ? "revision revision--latest" : "revision"} aria-labelledby={`rev-${revision.id}`}>
      <header className="revision__header">
        <h2 id={`rev-${revision.id}`} className="revision__title">
          Revision {revision.revisionNumber}
        </h2>
        <RevisionStatusBadge status={revision.quotationRevisionStatus} />
        <span className="revision__meta">
          Valid until {formatDateOnly(revision.validUntil)} · created {formatDateTime(revision.createdAt)}
        </span>
      </header>

      <dl className="facts">
        <div>
          <dt>Buyer</dt>
          <dd>
            {revision.buyerName}
            {revision.companyName && <span className="muted"> · {revision.companyName}</span>}
          </dd>
        </div>
        <div>
          <dt>Machine</dt>
          <dd>{revision.productName}</dd>
        </div>
      </dl>

      <div className="table-wrap revision__items">
        <table className="data-table data-table--compact">
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Qty</th>
              <th scope="col" className="numeric">
                Unit price
              </th>
              <th scope="col" className="numeric">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.name}
                  {item.description && <span className="data-table__secondary">{item.description}</span>}
                </td>
                <td>
                  {item.quantity} {item.unit}
                </td>
                <td className="numeric">{formatPrice(item.unitPrice)}</td>
                <td className="numeric">{formatPrice(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="revision__totals">
        <div>
          <dt>Taxable amount</dt>
          <dd>{formatPrice(revision.taxableAmount)}</dd>
        </div>
        <TaxRow label="CGST" rate={revision.cgstRate} amount={revision.cgstAmount} />
        <TaxRow label="SGST" rate={revision.sgstRate} amount={revision.sgstAmount} />
        <TaxRow label="IGST" rate={revision.igstRate} amount={revision.igstAmount} />
        <div className="totals__grand">
          <dt>Grand total</dt>
          <dd>{formatPrice(revision.grandTotal)}</dd>
        </div>
      </dl>

      {children && <div className="revision__actions">{children}</div>}
    </article>
  );
}
