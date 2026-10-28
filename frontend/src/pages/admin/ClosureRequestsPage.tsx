import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ApiError } from "../../api/client";
import {
  CLOSURE_REQUEST_STATUS_LABELS,
  CLOSURE_REQUEST_STATUSES,
  listClosureRequests,
  reviewClosureRequest,
} from "../../api/closureRequests";
import { useEmployee } from "../../auth/EmployeeContext";
import { LoadError } from "../../components/ui/LoadError";
import { LoadingState } from "../../components/ui/LoadingState";
import { Pagination } from "../../components/ui/Pagination";
import { StatusMessage } from "../../components/ui/StatusMessage";
import { ConfirmBar } from "../../features/admin/ConfirmBar";
import { InquiryStatusBadge } from "../../features/staff/InquiryStatusBadge";
import { useApiQuery } from "../../hooks/useApiQuery";
import type { ClosureRequest, ClosureRequestStatus } from "../../types/api";
import { formatDateTime } from "../../utils/format";

const REVIEW_NOTE_MAX = 350;

type Decision = "approve" | "reject";

// Approve or reject one pending request, with an optional note for the history.
function ReviewControls({ item, onReviewed }: { item: ClosureRequest; onReviewed: (message: string, failed: boolean) => void }) {
  const { request } = useEmployee();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!decision) return;
    setBusy(true);

    try {
      await reviewClosureRequest(request, item.id, decision, reviewNote.trim());
      onReviewed(decision === "approve" ? `Enquiry #${item.inquiryId} closed.` : `Request for enquiry #${item.inquiryId} rejected; it stays open.`, false);
    } catch (caught) {
      // A 409 means someone else decided first, or a quotation is now awaiting the customer.
      onReviewed(caught instanceof ApiError ? caught.message : "Something went wrong. Please try again.", true);
    } finally {
      setBusy(false);
      setDecision(null);
    }
  }

  if (!decision) {
    return (
      <div className="button-row">
        <button type="button" className="button button--primary" onClick={() => setDecision("approve")}>
          Approve…
        </button>
        <button type="button" className="button button--secondary" onClick={() => setDecision("reject")}>
          Reject…
        </button>
      </div>
    );
  }

  const noteId = `review-note-${item.id}`;

  return (
    <ConfirmBar
      confirmLabel={decision === "approve" ? "Yes, close the enquiry" : "Yes, reject"}
      busyLabel={decision === "approve" ? "Closing…" : "Rejecting…"}
      busy={busy}
      onConfirm={() => void confirm()}
      onCancel={() => setDecision(null)}
    >
      <span className="field">
        <span className="field__hint">
          {decision === "approve"
            ? `Enquiry #${item.inquiryId} will be closed.`
            : `Enquiry #${item.inquiryId} stays in progress; the salesperson can ask again or close it for a listed reason.`}
        </span>
        <label htmlFor={noteId} className="field__label">
          Review note <span className="muted">(optional)</span>
        </label>
        <textarea
          id={noteId}
          className="input textarea textarea--short"
          maxLength={REVIEW_NOTE_MAX}
          value={reviewNote}
          disabled={busy}
          onChange={(event) => setReviewNote(event.target.value)}
        />
      </span>
    </ConfirmBar>
  );
}

export function ClosureRequestsPage() {
  const { request } = useEmployee();
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get("status") as ClosureRequestStatus | null;
  const status: ClosureRequestStatus = statusParam && CLOSURE_REQUEST_STATUSES.includes(statusParam) ? statusParam : "PENDING";
  const page = Math.max(1, Math.floor(Number(searchParams.get("page")) || 1));
  const [message, setMessage] = useState<{ text: string; failed: boolean } | null>(null);

  const requests = useApiQuery((signal) => listClosureRequests(request, { status, page }, signal), [searchParams.toString()]);

  const hrefFor = (changes: { status?: ClosureRequestStatus; page?: number }) => {
    const query = new URLSearchParams();
    const nextStatus = changes.status ?? status;
    if (nextStatus !== "PENDING") query.set("status", nextStatus);
    if (changes.page && changes.page > 1) query.set("page", String(changes.page));
    const text = query.toString();
    return text ? `/app/closure-requests?${text}` : "/app/closure-requests";
  };

  return (
    <div className="container page-section">
      <title>Closure requests | Devdutt Industries Staff</title>
      <header className="page-header">
        <h1>Closure requests</h1>
        <p className="muted">Salespeople ask here to close an enquiry for a reason that isn't on the list.</p>
      </header>

      <nav className="tabs" aria-label="Request status">
        {CLOSURE_REQUEST_STATUSES.map((value) => (
          <Link key={value} to={hrefFor({ status: value })} className="tabs__tab" aria-current={value === status ? "page" : undefined}>
            {CLOSURE_REQUEST_STATUS_LABELS[value]}
          </Link>
        ))}
      </nav>

      {message && (
        <StatusMessage tone={message.failed ? "error" : "success"} {...(message.failed ? { title: "That didn't work" } : {})}>
          <p>{message.text}</p>
        </StatusMessage>
      )}

      {requests.status === "loading" && <LoadingState label="Loading closure requests" />}
      {requests.status === "error" && (
        <LoadError title="Closure requests couldn't be loaded" error={requests.error} onRetry={requests.reload} />
      )}

      {requests.status === "success" &&
        (requests.data.requests.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state__title">{status === "PENDING" ? "Nothing waiting for review" : "No requests here yet"}</p>
          </div>
        ) : (
          <>
            <ul className="request-list">
              {requests.data.requests.map((item) => (
                <li key={item.id} className="panel">
                  <h2 className="panel__title">
                    <Link to={`/app/inquiries/${item.inquiryId}`}>Enquiry #{item.inquiryId}</Link> · {item.inquiry.product.name}{" "}
                    <InquiryStatusBadge status={item.inquiry.status} />
                  </h2>
                  <p className="muted">
                    Requested by {item.requestedBy.name} on {formatDateTime(item.createdAt)}
                  </p>
                  <p className="preserve-lines">{item.note}</p>

                  {item.status === "PENDING" ? (
                    <ReviewControls
                      item={item}
                      onReviewed={(text, failed) => {
                        setMessage({ text, failed });
                        requests.reload();
                      }}
                    />
                  ) : (
                    <p className="muted">
                      {CLOSURE_REQUEST_STATUS_LABELS[item.status]} by {item.reviewedBy?.name ?? "an admin"}
                      {item.reviewedAt && ` on ${formatDateTime(item.reviewedAt)}`}
                      {item.reviewNote && `: ${item.reviewNote}`}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <Pagination page={requests.data.meta.page} totalPages={requests.data.meta.totalPages} hrefFor={(target) => hrefFor({ page: target })} />
          </>
        ))}
    </div>
  );
}
