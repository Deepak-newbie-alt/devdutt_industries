import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { ApiError } from "../api/client";
import { getCustomerInquiry, getCustomerQuotationPdf } from "../api/inquiries";
import { LoadError } from "../components/ui/LoadError";
import { LoadingState } from "../components/ui/LoadingState";
import { StatusMessage } from "../components/ui/StatusMessage";
import { INQUIRY_STATUS, quotationSummary, revisionBadge } from "../features/inquiries/customerStatus";
import { QuotationSupport } from "../features/inquiries/QuotationSupport";
import { useHistorySession, type HistorySession } from "../features/inquiries/historySession";
import { downloadPdf, openPdf } from "../features/quotations/pdfFiles";
import { useApiQuery } from "../hooks/useApiQuery";
import type { CustomerInquiryDetail, CustomerQuotationRevision, CustomerTimelineEvent } from "../types/api";
import { formatDateOnly, formatDateTime } from "../utils/format";
import { VerifyNumber } from "./MyInquiriesPage";

function Breadcrumbs({ inquiryId }: { inquiryId: number }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li>
          <Link to="/my-inquiries">My enquiries</Link>
        </li>
        <li aria-current="page">Enquiry #{inquiryId}</li>
      </ol>
    </nav>
  );
}

function timelineLabel(event: CustomerTimelineEvent) {
  switch (event.type) {
    case "RECEIVED":
      return "Enquiry received";
    case "IN_PROGRESS":
      return "Our team started working on it";
    case "QUOTATION_ISSUED":
      return event.revisionNumber === 1 ? "Quotation sent" : `Revised quotation sent (revision ${event.revisionNumber})`;
    case "CLOSED":
      return "Enquiry closed";
  }
}

// View and download the PDF issued for one sent version.
function RevisionPdf({
  inquiryId,
  revision,
  pdf,
  session,
  onMissing,
}: {
  inquiryId: number;
  revision: CustomerQuotationRevision;
  pdf: NonNullable<CustomerQuotationRevision["document"]>;
  session: HistorySession;
  // The server no longer has it: shown like a version that never had one.
  onMissing: () => void;
}) {
  const { end } = useHistorySession();
  const [busy, setBusy] = useState<"view" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set synchronously, so a second click before the re-render can't start another request.
  const pending = useRef(false);

  const fallbackName = pdf.fileName;
  const load = () => getCustomerQuotationPdf(inquiryId, revision.revisionNumber, session.accessToken);

  async function run(action: "view" | "download") {
    if (pending.current) {
      return;
    }

    pending.current = true;
    setBusy(action);
    setError(null);

    try {
      await (action === "view" ? openPdf(load, fallbackName) : downloadPdf(load, fallbackName));
    } catch (caught) {
      const failure = caught instanceof ApiError ? caught : new ApiError("Something went wrong. Please try again.", null);

      if (failure.status === 401) {
        end("expired");
        return;
      }

      if (failure.status === 404) {
        onMissing();
        return;
      }

      setError(failure.message);
    } finally {
      pending.current = false;
      setBusy(null);
    }
  }

  return (
    <>
      <div className="button-row">
        <button type="button" className="button button--secondary" disabled={busy !== null} onClick={() => run("view")}>
          {busy === "view" ? "Opening…" : "View PDF"}
          <span className="visually-hidden"> of revision {revision.revisionNumber}</span>
        </button>
        <button type="button" className="button button--secondary" disabled={busy !== null} onClick={() => run("download")}>
          {busy === "download" ? "Downloading…" : "Download PDF"}
          <span className="visually-hidden"> of revision {revision.revisionNumber}</span>
        </button>
      </div>
      {error && (
        <StatusMessage tone="error" title="The PDF couldn't be opened">
          <p>{error}</p>
        </StatusMessage>
      )}
    </>
  );
}

function RevisionItem({
  inquiryId,
  quotationNumber,
  revision,
  session,
}: {
  inquiryId: number;
  quotationNumber: string;
  revision: CustomerQuotationRevision;
  session: HistorySession;
}) {
  const badge = revisionBadge(revision);
  const [pdfMissing, setPdfMissing] = useState(false);
  const pdf = pdfMissing ? null : revision.document;

  // Versions sent before PDFs were kept have none; we never generate a stand-in.
  const reasons = [
    ...(pdf
      ? []
      : [
          `The PDF for quotation ${quotationNumber} (revision ${revision.revisionNumber}) isn't available online. Contact us and our team will send you a copy.`,
        ]),
    ...(revision.isCurrent && revision.canRespond
      ? [`Can't find the link for quotation ${quotationNumber}? Contact us and we'll send it again.`]
      : []),
  ];

  return (
    <li className={revision.isCurrent ? "revision-item revision-item--current" : "revision-item"}>
      <div className="history-card__header">
        <h3 className="revision-item__title">
          Revision {revision.revisionNumber}{" "}
          <span className="revision-item__tag">{revision.isCurrent ? "Current" : "Earlier version"}</span>
        </h3>
        <span className={`badge ${badge.className}`}>{badge.label}</span>
      </div>
      <p className="history-card__meta muted">Valid until {formatDateOnly(revision.validUntil)}</p>

      {revision.isCurrent ? (
        <p>{quotationSummary(revision)}</p>
      ) : (
        <p className="muted">Replaced by a newer version. Shown for your records.</p>
      )}

      {pdf && (
        <RevisionPdf
          inquiryId={inquiryId}
          revision={revision}
          pdf={pdf}
          session={session}
          onMissing={() => setPdfMissing(true)}
        />
      )}

      {reasons.length > 0 && (
        <QuotationSupport quotationNumber={quotationNumber} revisionNumber={revision.revisionNumber} reasons={reasons} />
      )}
    </li>
  );
}

function InquiryDetail({ inquiry, session }: { inquiry: CustomerInquiryDetail; session: HistorySession }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const status = INQUIRY_STATUS[inquiry.status];

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <>
      <title>{`Enquiry #${inquiry.id} | Devdutt Industries`}</title>
      <Breadcrumbs inquiryId={inquiry.id} />

      <header className="page-header">
        <div className="history-card__header">
          <h1 ref={headingRef} tabIndex={-1} className="history-heading">
            {inquiry.product.name}
          </h1>
          <span className={`badge ${status.badge}`}>{status.label}</span>
        </div>
        <p className="muted">
          Enquiry #{inquiry.id} · Sent {formatDateTime(inquiry.createdAt)}
        </p>
      </header>

      <section className="history-card detail-block" aria-labelledby="requirement-heading">
        <h2 id="requirement-heading" className="detail-block__heading">
          Your requirement
        </h2>
        <p className="history-card__requirement">{inquiry.requirement}</p>
      </section>

      <section className="history-card detail-block" aria-labelledby="quotation-heading">
        <h2 id="quotation-heading" className="detail-block__heading">
          {inquiry.quotation ? `Quotation ${inquiry.quotation.quotationNumber}` : "Quotation"}
        </h2>
        {inquiry.quotation ? (
          <ol className="revision-list">
            {inquiry.quotation.revisions.map((revision) => (
              <RevisionItem
                key={revision.revisionNumber}
                inquiryId={inquiry.id}
                quotationNumber={inquiry.quotation!.quotationNumber}
                revision={revision}
                session={session}
              />
            ))}
          </ol>
        ) : (
          <p className="muted">
            {inquiry.status === "CLOSED"
              ? "No quotation was sent for this enquiry."
              : "No quotation yet. Our team will send one to you."}
          </p>
        )}
      </section>

      <section className="history-card detail-block" aria-labelledby="timeline-heading">
        <h2 id="timeline-heading" className="detail-block__heading">
          History
        </h2>
        {inquiry.timeline.length === 0 ? (
          <p className="muted">No updates yet.</p>
        ) : (
          <ol className="timeline">
            {inquiry.timeline.map((event, index) => (
              <li key={index} className={`timeline__item${event.type === "CLOSED" ? " timeline__item--status_changed" : ""}`}>
                <p className="timeline__heading">
                  <span className="timeline__label">{timelineLabel(event)}</span>
                  <span className="timeline__meta">{formatDateTime(event.at)}</span>
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="button-row history-actions">
        <Link to="/my-inquiries" className="button button--secondary">
          Back to my enquiries
        </Link>
      </div>
    </>
  );
}

function LoadedInquiry({ inquiryId, session }: { inquiryId: number; session: HistorySession }) {
  const { end } = useHistorySession();
  const inquiry = useApiQuery((signal) => getCustomerInquiry(inquiryId, session.accessToken, signal), [inquiryId, session.accessToken]);
  const expired = inquiry.status === "error" && inquiry.error.status === 401;

  // Access ran out on the server: back to the verify step.
  useEffect(() => {
    if (expired) {
      end("expired");
    }
  }, [expired, end]);

  if (inquiry.status === "loading" || expired) {
    return <LoadingState label="Loading your enquiry" />;
  }

  if (inquiry.status === "error") {
    if (inquiry.error.status === 404 || inquiry.error.status === 400) {
      return (
        <>
          <title>Enquiry not found | Devdutt Industries</title>
          <h1>Enquiry not found</h1>
          <p>We couldn't find this enquiry among those sent from +91 {session.phone}.</p>
          <Link to="/my-inquiries" className="button button--secondary">
            Back to my enquiries
          </Link>
        </>
      );
    }

    return (
      <>
        <Breadcrumbs inquiryId={inquiryId} />
        <LoadError title="Your enquiry couldn't be loaded" error={inquiry.error} onRetry={inquiry.reload} />
      </>
    );
  }

  return <InquiryDetail inquiry={inquiry.data} session={session} />;
}

export function MyInquiryDetailPage() {
  const { inquiryId } = useParams();
  const { session } = useHistorySession();
  const id = Number(inquiryId);

  // Opened directly, after a refresh, or after access expired: verify first, then show it.
  if (!session) {
    return (
      <>
        <title>My enquiries | Devdutt Industries</title>
        <header className="page-header">
          <h1>View your enquiry</h1>
          <p className="muted">Confirm the mobile number you used for this enquiry to see its details.</p>
        </header>
        <VerifyNumber />
      </>
    );
  }

  if (!Number.isInteger(id) || id <= 0) {
    return (
      <>
        <h1>Enquiry not found</h1>
        <Link to="/my-inquiries" className="button button--secondary">
          Back to my enquiries
        </Link>
      </>
    );
  }

  return <LoadedInquiry inquiryId={id} session={session} />;
}
