import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { HistoryLookupForm } from "../features/inquiries/HistoryLookupForm";
import type { CustomerInquiry, CustomerInquiryHistory } from "../types/api";
import { formatDateOnly, formatDateTime } from "../utils/format";

// Customer wording for where an enquiry stands.
const STATUS: Record<CustomerInquiry["status"], { label: string; badge: string }> = {
  OPEN: { label: "Received", badge: "badge--open" },
  IN_PROGRESS: { label: "In progress", badge: "badge--in-progress" },
  CLOSED: { label: "Closed", badge: "badge--closed" },
};

// Same wording as the quotation link page. The link itself isn't stored, so it can't be shown here.
function quotationSummary(quotation: NonNullable<CustomerInquiry["quotation"]>) {
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

function InquiryCard({ inquiry }: { inquiry: CustomerInquiry }) {
  const status = STATUS[inquiry.status];

  return (
    <li className="history-card">
      <div className="history-card__header">
        <h2 className="history-card__product">{inquiry.product.name}</h2>
        <span className={`badge ${status.badge}`}>{status.label}</span>
      </div>
      <p className="history-card__meta muted">
        Enquiry #{inquiry.id} · {formatDateTime(inquiry.createdAt)}
      </p>
      <p className="history-card__requirement">{inquiry.requirement}</p>

      {inquiry.quotation ? (
        <div className="history-card__quotation">
          <p>
            <strong>Quotation {inquiry.quotation.quotationNumber}</strong>
            {inquiry.quotation.revisionNumber > 1 && ` (revision ${inquiry.quotation.revisionNumber})`}
          </p>
          <p>{quotationSummary(inquiry.quotation)}</p>
          {inquiry.quotation.canRespond && (
            <p className="muted">Can't find the link? Contact us using the details below and we'll send it again.</p>
          )}
        </div>
      ) : (
        inquiry.status !== "CLOSED" && <p className="muted">No quotation yet. Our team will send one to you.</p>
      )}
    </li>
  );
}

function HistoryResults({
  history,
  phone,
  onStartOver,
}: {
  history: CustomerInquiryHistory;
  phone: string;
  onStartOver: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus so screen-reader and keyboard users land on the results.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const count = history.inquiries.length;

  return (
    <>
      <header className="page-header">
        <h1 ref={headingRef} tabIndex={-1} className="history-heading">
          My enquiries
        </h1>
        <p className="muted">
          Enquiries sent from <strong>+91 {phone}</strong>.
        </p>
      </header>

      {count === 0 ? (
        <div className="history-empty">
          <p>We couldn't find any enquiries from this number.</p>
          <p className="muted">If you used a different number, check that one instead.</p>
        </div>
      ) : (
        <>
          {history.totalInquiries > count && (
            <p className="muted">
              Showing your {count} most recent enquiries of {history.totalInquiries}.
            </p>
          )}
          <ul className="history-list">
            {history.inquiries.map((inquiry) => (
              <InquiryCard key={inquiry.id} inquiry={inquiry} />
            ))}
          </ul>
        </>
      )}

      <div className="button-row history-actions">
        <Link to="/machines" className="button button--primary">
          Browse machines
        </Link>
        <button type="button" className="button button--secondary" onClick={onStartOver}>
          Check a different number
        </button>
      </div>
    </>
  );
}

export function MyInquiriesPage() {
  // Kept in memory only: leaving the page or starting over clears it.
  const [found, setFound] = useState<{ history: CustomerInquiryHistory; phone: string } | null>(null);

  return (
    <div className="container page-section narrow">
      <title>My enquiries | Devdutt Industries</title>
      {found ? (
        <HistoryResults history={found.history} phone={found.phone} onStartOver={() => setFound(null)} />
      ) : (
        <>
          <header className="page-header">
            <h1>My enquiries</h1>
            <p className="muted">See the enquiries you've sent us and where they stand. No account needed.</p>
          </header>
          <HistoryLookupForm onFound={(history, phone) => setFound({ history, phone })} />
        </>
      )}
    </div>
  );
}
