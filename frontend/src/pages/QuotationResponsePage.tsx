import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { lookupQuotation, type CustomerAction } from "../api/customerQuotations";
import { LoadError } from "../components/ui/LoadError";
import { LoadingState } from "../components/ui/LoadingState";
import { StatusMessage } from "../components/ui/StatusMessage";
import { readLinkToken, removeTokenFromAddressBar } from "../features/quotation-response/linkToken";
import { QuotationResponseForm } from "../features/quotation-response/QuotationResponseForm";
import { useApiQuery } from "../hooks/useApiQuery";
import type { CustomerQuotation } from "../types/api";
import { formatDateOnly } from "../utils/format";

const RESPONDED: Record<CustomerAction, string> = {
  accept: "Thank you. You've accepted this quotation, and our team will contact you to confirm the order.",
  "request-revision": "Thank you. We've received your request for changes, and our team will contact you.",
  reject: "Thank you for letting us know. You've declined this quotation.",
};

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="container page-section narrow">
      <title>Your quotation | Devdutt Industries</title>
      {children}
    </div>
  );
}

function LinkProblem({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Shell>
      <h1>{title}</h1>
      {children}
      <p>
        If you need help, contact us using the details below.{" "}
        <Link to="/machines">Browse our machines</Link>
      </p>
    </Shell>
  );
}

// What the customer can (or can no longer) do, from the quotation's current state.
function statusSummary(quotation: CustomerQuotation): { tone: "info" | "success" | "error"; text: string } {
  const validUntil = formatDateOnly(quotation.validUntil);

  switch (quotation.quotationRevisionStatus) {
    case "SENT":
      return quotation.canRespond
        ? { tone: "info", text: `Awaiting your response. This quotation is valid until ${validUntil}.` }
        : { tone: "error", text: `This quotation expired on ${validUntil}. Contact us if you'd like an updated one.` };
    case "ACCEPTED":
      return { tone: "success", text: "You accepted this quotation. Our team will contact you about the order." };
    case "REJECTED":
      return { tone: "info", text: "You declined this quotation." };
    case "REVISION_REQUESTED":
      return { tone: "info", text: "You asked for changes. Our team will send you a revised quotation." };
    case "SUPERSEDED":
      return {
        tone: "info",
        text: "A newer version of this quotation has been sent to you. Please use the link from that message.",
      };
    case "EXPIRED":
      return { tone: "error", text: `This quotation expired on ${validUntil}. Contact us if you'd like an updated one.` };
    default:
      return { tone: "info", text: "This quotation isn't available for a response." };
  }
}

function QuotationView({ token }: { token: string }) {
  const quotation = useApiQuery((signal) => lookupQuotation(token, signal), [token]);
  const [responded, setResponded] = useState<CustomerAction | null>(null);
  const [stale, setStale] = useState(false);

  const reload = quotation.reload;
  const handleStale = useCallback(() => {
    setStale(true);
    reload();
  }, [reload]);

  if (quotation.status === "loading") {
    return (
      <Shell>
        <LoadingState label="Loading your quotation" />
      </Shell>
    );
  }

  if (quotation.status === "error") {
    if (quotation.error.status === 404 || quotation.error.status === 400) {
      return (
        <LinkProblem title="This link doesn't work">
          <p>
            The quotation link is invalid or has been replaced by a newer one. Please use the most recent link our
            team sent you.
          </p>
        </LinkProblem>
      );
    }

    return (
      <Shell>
        <h1>Your quotation</h1>
        <LoadError title="Your quotation couldn't be loaded" error={quotation.error} onRetry={quotation.reload} />
      </Shell>
    );
  }

  const data = quotation.data;
  const summary = statusSummary(data);

  return (
    <Shell>
      <p className="eyebrow">Your quotation</p>
      <h1 className="quotation-response__number">{data.quotationNumber}</h1>

      <dl className="quotation-facts">
        <div>
          <dt>Revision</dt>
          <dd>{data.revisionNumber}</dd>
        </div>
        <div>
          <dt>Valid until</dt>
          <dd>{formatDateOnly(data.validUntil)}</dd>
        </div>
      </dl>

      {responded ? (
        <StatusMessage tone="success" title="Response sent">
          <p>{RESPONDED[responded]}</p>
        </StatusMessage>
      ) : (
        <>
          {stale && !data.canRespond && (
            <StatusMessage tone="info" title="This quotation has changed">
              <p>It can no longer be answered with this link. Its current status is shown below.</p>
            </StatusMessage>
          )}
          <StatusMessage tone={summary.tone}>
            <p>{summary.text}</p>
          </StatusMessage>
        </>
      )}

      {data.canRespond && !responded && (
        <section className="quotation-response" aria-labelledby="respond-heading">
          <h2 id="respond-heading">Your response</h2>
          <p className="muted">
            Please review the quotation document our team shared with you, then choose a response.
          </p>
          <QuotationResponseForm
            token={token}
            quotation={data}
            onResponded={(action) => {
              setResponded(action);
              reload();
            }}
            onStale={handleStale}
          />
        </section>
      )}
    </Shell>
  );
}

export function QuotationResponsePage() {
  // Read once on first render; the token is then kept only in memory.
  const [link] = useState(() => readLinkToken(window.location.hash));

  useEffect(() => {
    removeTokenFromAddressBar();
  }, []);

  if (link.kind === "missing") {
    return (
      <LinkProblem title="Open your quotation link">
        <p>
          This page shows a quotation from the link our sales team sent you. Please open that link again. For your
          security, the link isn't kept in the address bar, so reloading this page won't work.
        </p>
      </LinkProblem>
    );
  }

  if (link.kind === "malformed") {
    return (
      <LinkProblem title="This link doesn't work">
        <p>The quotation link looks incomplete. Please open it again from the message our team sent you.</p>
      </LinkProblem>
    );
  }

  return <QuotationView token={link.token} />;
}
