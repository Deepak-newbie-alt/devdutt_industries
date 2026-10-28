import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ApiError } from "../../api/client";
import { createOrder } from "../../api/staffOrders";
import {
  createNextRevision,
  downloadIssuedPdf,
  getRevisions,
  previewDraftPdf,
  reissueCustomerLink,
  sendRevision,
} from "../../api/staffQuotations";
import { useEmployee } from "../../auth/EmployeeContext";
import { LoadError } from "../../components/ui/LoadError";
import { LoadingState } from "../../components/ui/LoadingState";
import { StatusMessage } from "../../components/ui/StatusMessage";
import { CustomerLinkPanel } from "../../features/quotations/CustomerLinkPanel";
import { downloadPdf, openPdf } from "../../features/quotations/pdfFiles";
import { RevisionCard } from "../../features/quotations/RevisionCard";
import { OrderStatusBadge } from "../../features/quotations/RevisionStatusBadge";
import { useApiQuery } from "../../hooks/useApiQuery";
import type { QuotationRevision } from "../../types/api";

// Two-step buttons: the first click asks, the second does it.
type Confirming = { revisionId: number; action: "send" | "reissue" } | null;

export function QuotationPage() {
  const { employee, request, requestFile } = useEmployee();
  const { quotationId } = useParams();
  const navigate = useNavigate();
  const id = Number(quotationId);
  const validId = Number.isInteger(id) && id > 0;

  const revisions = useApiQuery(
    (signal) => (validId ? getRevisions(request, id, signal) : Promise.reject(new ApiError("Quotation not found", 404))),
    [quotationId],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [shownLink, setShownLink] = useState<{ revisionId: number; revisionNumber: number; link: string } | null>(null);

  // Runs one action at a time and reports its error at the top of the page.
  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    setActionError(null);

    try {
      await action();
    } catch (caught) {
      setActionError(caught instanceof ApiError ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (revisions.status === "loading") {
    return (
      <div className="container page-section">
        <LoadingState label="Loading quotation" />
      </div>
    );
  }

  if (revisions.status === "error") {
    const status = revisions.error.status;
    return (
      <div className="container page-section narrow">
        <title>Quotation | Devdutt Industries Staff</title>
        {status === 404 || status === 400 || status === 403 ? (
          <>
            <h1>{status === 403 ? "This quotation belongs to someone else" : "Quotation not found"}</h1>
            <Link to="/app/inquiries" className="button button--primary">
              Back to inquiries
            </Link>
          </>
        ) : (
          <LoadError title="This quotation couldn't be loaded" error={revisions.error} onRetry={revisions.reload} />
        )}
      </div>
    );
  }

  const all = revisions.data;
  const first = all[0];

  if (!first) {
    return (
      <div className="container page-section narrow">
        <h1>Quotation has no revisions</h1>
      </div>
    );
  }

  const quotationNumber = first.quotation.quotationNumber;
  const inquiryId = first.quotation.inquiryId;
  const isOwner = employee.role === "SALESPERSON" && first.quotation.salespersonId === employee.id;
  // A closed enquiry's draft or change request can't move forward; the backend refuses it too.
  const inquiryClosed = first.quotation.inquiry.status === "CLOSED";
  const canChange = isOwner && !inquiryClosed;
  const latest = all[all.length - 1] as QuotationRevision;
  const newestFirst = [...all].reverse();
  const disabled = busy !== null;

  const actionsFor = (revision: QuotationRevision) => {
    const status = revision.quotationRevisionStatus;
    const isLatest = revision.id === latest.id;
    const pdfName = `${quotationNumber}-rev-${revision.revisionNumber}.pdf`;
    const askSend = confirming?.revisionId === revision.id && confirming.action === "send";
    const askReissue = confirming?.revisionId === revision.id && confirming.action === "reissue";

    return (
      <>
        {status === "DRAFT" && isOwner && (
          <>
            {canChange && (
              <Link to={`/app/quotations/${id}/revisions/${revision.id}/edit`} className="button button--secondary">
                Edit draft
              </Link>
            )}
            <button
              type="button"
              className="button button--secondary"
              disabled={disabled}
              onClick={() => run(`preview-${revision.id}`, () => openPdf(() => previewDraftPdf(requestFile, revision.id), pdfName))}
            >
              {busy === `preview-${revision.id}` ? "Preparing PDF…" : "Preview PDF"}
            </button>
            {!canChange ? null : askSend ? (
              <span className="confirm">
                <span>Issue the PDF and create the customer link? The revision can't be edited afterwards.</span>
                <button
                  type="button"
                  className="button button--accent"
                  disabled={disabled}
                  onClick={() =>
                    run(`send-${revision.id}`, async () => {
                      const sent = await sendRevision(request, revision.id);
                      setConfirming(null);
                      setShownLink({ revisionId: revision.id, revisionNumber: revision.revisionNumber, link: sent.customerLink });
                      revisions.reload();
                    })
                  }
                >
                  {busy === `send-${revision.id}` ? "Sending…" : "Yes, send"}
                </button>
                <button type="button" className="button button--secondary" disabled={disabled} onClick={() => setConfirming(null)}>
                  Cancel
                </button>
              </span>
            ) : (
              <button type="button" className="button button--accent" disabled={disabled} onClick={() => setConfirming({ revisionId: revision.id, action: "send" })}>
                Send to customer…
              </button>
            )}
          </>
        )}

        {revision.document && (
          <button
            type="button"
            className="button button--secondary"
            disabled={disabled}
            onClick={() => run(`pdf-${revision.id}`, () => downloadPdf(() => downloadIssuedPdf(requestFile, revision.id), pdfName))}
          >
            {busy === `pdf-${revision.id}` ? "Downloading…" : "Download issued PDF"}
          </button>
        )}

        {status === "SENT" && isOwner && shownLink?.revisionId !== revision.id &&
          (askReissue ? (
            <span className="confirm">
              <span>The customer's current link will stop working.</span>
              <button
                type="button"
                className="button button--primary"
                disabled={disabled}
                onClick={() =>
                  run(`reissue-${revision.id}`, async () => {
                    const result = await reissueCustomerLink(request, revision.id);
                    setConfirming(null);
                    setShownLink({ revisionId: revision.id, revisionNumber: revision.revisionNumber, link: result.customerLink });
                  })
                }
              >
                {busy === `reissue-${revision.id}` ? "Generating…" : "Generate new link"}
              </button>
              <button type="button" className="button button--secondary" disabled={disabled} onClick={() => setConfirming(null)}>
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" className="button button--secondary" disabled={disabled} onClick={() => setConfirming({ revisionId: revision.id, action: "reissue" })}>
              New customer link…
            </button>
          ))}

        {status === "REVISION_REQUESTED" && isLatest && canChange && (
          <button
            type="button"
            className="button button--accent"
            disabled={disabled}
            onClick={() =>
              run("next-revision", async () => {
                const draft = await createNextRevision(request, id);
                navigate(`/app/quotations/${id}/revisions/${draft.id}/edit`);
              })
            }
          >
            {busy === "next-revision" ? "Creating…" : `Create revision ${revision.revisionNumber + 1}`}
          </button>
        )}

        {status === "ACCEPTED" &&
          (revision.order ? (
            <Link to={`/app/orders/${revision.order.id}`} className="button button--primary">
              Order {revision.order.orderNumber} <OrderStatusBadge status={revision.order.status} />
            </Link>
          ) : (
            isOwner && (
              <button
                type="button"
                className="button button--accent"
                disabled={disabled}
                onClick={() =>
                  run("create-order", async () => {
                    const order = await createOrder(request, revision.id);
                    navigate(`/app/orders/${order.id}`);
                  })
                }
              >
                {busy === "create-order" ? "Creating order…" : "Create order"}
              </button>
            )
          ))}
      </>
    );
  };

  return (
    <div className="container page-section">
      <title>{`${quotationNumber} | Devdutt Industries Staff`}</title>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link to="/app/inquiries">Inquiries</Link>
          </li>
          <li>
            <Link to={`/app/inquiries/${inquiryId}`}>Enquiry #{inquiryId}</Link>
          </li>
          <li aria-current="page">{quotationNumber}</li>
        </ol>
      </nav>

      <header className="detail-header">
        <h1>{quotationNumber}</h1>
      </header>

      {latest.quotationRevisionStatus === "REVISION_REQUESTED" && canChange && (
        <StatusMessage tone="info" title="The customer asked for changes">
          <p>Contact them to agree what should change, then create the next revision.</p>
        </StatusMessage>
      )}

      {inquiryClosed && isOwner && (latest.quotationRevisionStatus === "DRAFT" || latest.quotationRevisionStatus === "REVISION_REQUESTED") && (
        <StatusMessage tone="info" title="This enquiry is closed">
          <p>The quotation can't be edited, sent or revised any more.</p>
        </StatusMessage>
      )}

      {actionError && (
        <StatusMessage tone="error" title="That didn't work">
          <p>{actionError}</p>
        </StatusMessage>
      )}

      <div className="revisions">
        {newestFirst.map((revision) => (
          <div key={revision.id}>
            {shownLink?.revisionId === revision.id && (
              <CustomerLinkPanel link={shownLink.link} revisionNumber={shownLink.revisionNumber} onDone={() => setShownLink(null)} />
            )}
            <RevisionCard revision={revision} latest={revision.id === latest.id}>
              {actionsFor(revision)}
            </RevisionCard>
          </div>
        ))}
      </div>
    </div>
  );
}
