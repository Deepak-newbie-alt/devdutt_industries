import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Outlet } from "react-router";
import { StatusMessage } from "../components/ui/StatusMessage";
import { HistoryLookupForm } from "../features/inquiries/HistoryLookupForm";
import { INQUIRY_STATUS, LOST_LINK_HINT, quotationSummary } from "../features/inquiries/customerStatus";
import {
  EXPIRED_NOTICE,
  useHistorySession,
  type HistoryOutletContext,
  type HistorySession,
} from "../features/inquiries/historySession";
import type { CustomerInquiry, CustomerInquiryHistory } from "../types/api";
import { formatDateTime } from "../utils/format";

// Holds the verified session for /my-inquiries and its detail pages, in memory only.
export function MyInquiriesLayout() {
  const [session, setSession] = useState<HistorySession | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const start = useCallback((history: CustomerInquiryHistory, phone: string) => {
    setNotice(null);
    setSession({
      phone,
      history,
      accessToken: history.access.token,
      expiresAt: Date.now() + history.access.expiresInSeconds * 1000,
    });
  }, []);

  const end = useCallback((reason: "expired" | "signed-out") => {
    setSession(null);
    setNotice(reason === "expired" ? EXPIRED_NOTICE : null);
  }, []);

  // When access runs out, the enquiries leave the screen too.
  useEffect(() => {
    if (!session) {
      return;
    }

    const timer = window.setTimeout(() => end("expired"), Math.max(0, session.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [session, end]);

  const context: HistoryOutletContext = { session, notice, start, end };

  return (
    <div className="container page-section narrow">
      <Outlet context={context} />
    </div>
  );
}

// The phone and code steps, with the reason a previous session ended.
export function VerifyNumber() {
  const { notice, start } = useHistorySession();

  return (
    <>
      {notice && (
        <StatusMessage tone="info" title="Please verify again">
          <p>{notice}</p>
        </StatusMessage>
      )}
      <HistoryLookupForm onFound={start} />
    </>
  );
}

function InquiryCard({ inquiry }: { inquiry: CustomerInquiry }) {
  const status = INQUIRY_STATUS[inquiry.status];
  const detailPath = `/my-inquiries/${inquiry.id}`;

  return (
    <li className="history-card">
      <div className="history-card__header">
        <h2 className="history-card__product">
          <Link to={detailPath}>{inquiry.product.name}</Link>
        </h2>
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
          {inquiry.quotation.canRespond && <p className="muted">{LOST_LINK_HINT}</p>}
        </div>
      ) : (
        inquiry.status !== "CLOSED" && <p className="muted">No quotation yet. Our team will send one to you.</p>
      )}

      <p className="history-card__more">
        <Link to={detailPath}>
          View details<span className="visually-hidden"> of enquiry #{inquiry.id}</span>
        </Link>
      </p>
    </li>
  );
}

function HistoryResults({ session, onStartOver }: { session: HistorySession; onStartOver: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { history, phone } = session;

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
  const { session, end } = useHistorySession();

  return (
    <>
      <title>My enquiries | Devdutt Industries</title>
      {session ? (
        <HistoryResults session={session} onStartOver={() => end("signed-out")} />
      ) : (
        <>
          <header className="page-header">
            <h1>My enquiries</h1>
            <p className="muted">See the enquiries you've sent us and where they stand. No account needed.</p>
          </header>
          <VerifyNumber />
        </>
      )}
    </>
  );
}
