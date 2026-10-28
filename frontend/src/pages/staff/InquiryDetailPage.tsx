import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { ApiError } from "../../api/client";
import {
  addInquiryActivity,
  claimInquiry,
  closeInquiry,
  getInquiry,
  getInquiryActivities,
  type ActivityKind,
} from "../../api/staffInquiries";
import { useEmployee } from "../../auth/EmployeeContext";
import { LoadError } from "../../components/ui/LoadError";
import { LoadingState } from "../../components/ui/LoadingState";
import { StatusMessage } from "../../components/ui/StatusMessage";
import { ActivityTimeline } from "../../features/staff/ActivityTimeline";
import { InquiryStatusBadge } from "../../features/staff/InquiryStatusBadge";
import { useApiQuery } from "../../hooks/useApiQuery";
import type { StaffInquiry } from "../../types/api";
import { formatDateTime, formatPrice, formatUnit } from "../../utils/format";

const NOTE_MAX = 350;

function errorText(caught: unknown) {
  return caught instanceof ApiError ? caught.message : "Something went wrong. Please try again.";
}

function ActivityForm({ inquiryId, onAdded }: { inquiryId: number; onAdded: () => void }) {
  const { request } = useEmployee();
  const [kind, setKind] = useState<ActivityKind>("contact");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = note.trim();

    if (!text) {
      setError("Write a short note first.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await addInquiryActivity(request, inquiryId, kind, text);
      setNote("");
      onAdded();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <h2 className="panel__title">Add to the history</h2>
      <fieldset className="choice-row">
        <legend className="field__label">Type</legend>
        <label>
          <input type="radio" name="activity-kind" checked={kind === "contact"} onChange={() => setKind("contact")} />{" "}
          Customer contacted
        </label>
        <label>
          <input type="radio" name="activity-kind" checked={kind === "note"} onChange={() => setKind("note")} /> Internal
          note
        </label>
      </fieldset>
      <label htmlFor="activity-note" className="field__label">
        Note
      </label>
      <textarea
        id="activity-note"
        className="input textarea textarea--short"
        maxLength={NOTE_MAX}
        value={note}
        disabled={saving}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "activity-error" : undefined}
        onChange={(event) => {
          setNote(event.target.value);
          setError(null);
        }}
      />
      <p className="field__counter">
        {note.length} / {NOTE_MAX}
      </p>
      {error && (
        <p id="activity-error" className="field__error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="button button--primary" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

function CloseInquiryForm({ inquiryId, onClosed }: { inquiryId: number; onClosed: () => void }) {
  const { request } = useEmployee();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" className="button button--secondary" onClick={() => setOpen(true)}>
        Close enquiry…
      </button>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = reason.trim();

    if (!text) {
      setError("Give a reason so the history explains why it was closed.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await closeInquiry(request, inquiryId, text);
      onClosed();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="panel panel--warning" onSubmit={submit} noValidate>
      <h2 className="panel__title">Close this enquiry</h2>
      <p className="muted">Close it when no quotation is needed, for example a duplicate enquiry or a customer who stopped replying.</p>
      <label htmlFor="close-reason" className="field__label">
        Reason
      </label>
      <textarea
        id="close-reason"
        className="input textarea textarea--short"
        maxLength={NOTE_MAX}
        value={reason}
        disabled={saving}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "close-error" : undefined}
        onChange={(event) => {
          setReason(event.target.value);
          setError(null);
        }}
      />
      {error && (
        <p id="close-error" className="field__error" role="alert">
          {error}
        </p>
      )}
      <div className="button-row">
        <button type="submit" className="button button--primary" disabled={saving}>
          {saving ? "Closing…" : "Close enquiry"}
        </button>
        <button type="button" className="button button--secondary" disabled={saving} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function ClaimPanel({ inquiry, onClaimed }: { inquiry: StaffInquiry; onClaimed: () => void }) {
  const { request } = useEmployee();
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setClaiming(true);
    setError(null);

    try {
      await claimInquiry(request, inquiry.id);
      onClaimed();
    } catch (caught) {
      setError(errorText(caught));
      // Someone else may have claimed it first: refresh to show who has it now.
      if (caught instanceof ApiError && caught.status === 409) onClaimed();
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="panel">
      <h2 className="panel__title">Unclaimed enquiry</h2>
      <p>Claim it to take ownership: you'll be able to contact the customer, keep notes and prepare a quotation.</p>
      {error && (
        <StatusMessage tone="error">
          <p>{error}</p>
        </StatusMessage>
      )}
      <button type="button" className="button button--accent" disabled={claiming} onClick={claim}>
        {claiming ? "Claiming…" : "Claim enquiry"}
      </button>
    </div>
  );
}

export function InquiryDetailPage() {
  const { employee, request } = useEmployee();
  const { inquiryId } = useParams();
  const id = Number(inquiryId);
  const validId = Number.isInteger(id) && id > 0;

  const inquiry = useApiQuery(
    (signal) => (validId ? getInquiry(request, id, signal) : Promise.reject(new ApiError("Inquiry not found", 404))),
    [inquiryId],
  );
  const activities = useApiQuery(
    (signal) => (validId ? getInquiryActivities(request, id, signal) : Promise.resolve([])),
    [inquiryId],
  );

  const refresh = () => {
    inquiry.reload();
    activities.reload();
  };

  if (inquiry.status === "loading") {
    return (
      <div className="container page-section">
        <LoadingState label="Loading enquiry" />
      </div>
    );
  }

  if (inquiry.status === "error") {
    const notFound = inquiry.error.status === 404 || inquiry.error.status === 400;
    const forbidden = inquiry.error.status === 403;

    return (
      <div className="container page-section narrow">
        <title>Enquiry | Devdutt Industries Staff</title>
        {notFound || forbidden ? (
          <>
            <h1>{notFound ? "Enquiry not found" : "This enquiry belongs to someone else"}</h1>
            <p>
              {notFound
                ? "It doesn't exist, or the link is wrong."
                : "Another salesperson has claimed it, so only they can view and work on it."}
            </p>
            <Link to="/app/inquiries" className="button button--primary">
              Back to inquiries
            </Link>
          </>
        ) : (
          <LoadError title="This enquiry couldn't be loaded" error={inquiry.error} onRetry={inquiry.reload} />
        )}
      </div>
    );
  }

  const data = inquiry.data;
  const isSalesperson = employee.role === "SALESPERSON";
  const isOwner = data.salespersonId === employee.id;
  const canClaim = isSalesperson && data.status === "OPEN" && data.salespersonId === null;

  return (
    <div className="container page-section">
      <title>{`Enquiry #${data.id} | Devdutt Industries Staff`}</title>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link to={`/app/inquiries?status=${data.status}`}>Inquiries</Link>
          </li>
          <li aria-current="page">Enquiry #{data.id}</li>
        </ol>
      </nav>

      <header className="detail-header">
        <h1>Enquiry #{data.id}</h1>
        <InquiryStatusBadge status={data.status} />
      </header>

      <div className="detail-grid">
        <div className="detail-main">
          <section className="panel" aria-labelledby="request-heading">
            <h2 id="request-heading" className="panel__title">
              Customer request
            </h2>
            <dl className="facts">
              <div>
                <dt>Received</dt>
                <dd>{formatDateTime(data.createdAt)}</dd>
              </div>
              <div>
                <dt>Customer mobile</dt>
                <dd>
                  <a href={`tel:+91${data.phoneNumber}`}>+91 {data.phoneNumber}</a>
                </dd>
              </div>
              <div>
                <dt>Machine</dt>
                <dd>
                  {data.product.name}{" "}
                  <span className="muted">
                    ({formatPrice(data.product.price)} per {formatUnit(data.product.unit)})
                  </span>
                </dd>
              </div>
              <div>
                <dt>Assigned to</dt>
                <dd>{data.salespersonId === null ? "Nobody yet" : isOwner ? "You" : `Staff #${data.salespersonId}`}</dd>
              </div>
            </dl>
            <h3 className="panel__subtitle">Requirement</h3>
            <p className="preserve-lines">{data.requirement}</p>
          </section>

          <section className="panel" aria-labelledby="history-heading">
            <h2 id="history-heading" className="panel__title">
              History
            </h2>
            {activities.status === "loading" && <LoadingState label="Loading history" />}
            {activities.status === "error" && (
              <LoadError title="History couldn't be loaded" error={activities.error} onRetry={activities.reload} />
            )}
            {activities.status === "success" && (
              <ActivityTimeline activities={activities.data} currentEmployeeId={employee.id} />
            )}
          </section>
        </div>

        <aside className="detail-side">
          {canClaim && <ClaimPanel inquiry={data} onClaimed={refresh} />}

          <section className="panel" aria-labelledby="quotation-heading">
            <h2 id="quotation-heading" className="panel__title">
              Quotation
            </h2>
            {data.quotation ? (
              <Link to={`/app/quotations/${data.quotation.id}`} className="button button--primary">
                Open {data.quotation.quotationNumber}
              </Link>
            ) : isSalesperson && isOwner && data.status === "IN_PROGRESS" ? (
              <>
                <p className="muted">No quotation yet.</p>
                <Link to={`/app/inquiries/${data.id}/quotation/new`} className="button button--accent">
                  Create quotation
                </Link>
              </>
            ) : (
              <p className="muted">No quotation for this enquiry.</p>
            )}
          </section>

          {isSalesperson && isOwner && <ActivityForm inquiryId={data.id} onAdded={activities.reload} />}
          {isSalesperson && isOwner && data.status === "IN_PROGRESS" && (
            <CloseInquiryForm inquiryId={data.id} onClosed={refresh} />
          )}
        </aside>
      </div>
    </div>
  );
}
