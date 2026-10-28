import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import { requestQuotationCode, respondToQuotation, type CustomerAction } from "../../api/customerQuotations";
import { StatusMessage } from "../../components/ui/StatusMessage";
import type { CustomerQuotation } from "../../types/api";
import { OtpCodeStep } from "../otp/OtpCodeStep";
import { useOtpChallenge } from "../otp/useOtpChallenge";

const MAX_CODE_ATTEMPTS = 5;

const ACTIONS: Record<CustomerAction, { label: string; confirm: string; explain: string }> = {
  accept: {
    label: "Accept quotation",
    confirm: "Confirm acceptance",
    explain: "You agree to the prices and terms in this quotation. Our team will contact you to confirm the order.",
  },
  "request-revision": {
    label: "Request changes",
    confirm: "Confirm request for changes",
    explain: "Our team will contact you about what you'd like changed and send you a revised quotation.",
  },
  reject: {
    label: "Decline quotation",
    confirm: "Confirm decline",
    explain: "This tells us you don't want to go ahead, and closes your enquiry.",
  },
};

type QuotationResponseFormProps = {
  token: string;
  quotation: CustomerQuotation;
  onResponded: (action: CustomerAction) => void;
  // The quotation changed on our side (answered, expired, link replaced): reload it.
  onStale: () => void;
};

export function QuotationResponseForm({ token, quotation, onResponded, onStale }: QuotationResponseFormProps) {
  const [action, setAction] = useState<CustomerAction | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  const request = useCallback(() => requestQuotationCode(token, action ?? "accept"), [token, action]);
  const otp = useOtpChallenge(request);

  useEffect(() => {
    if (otp.challengeId) {
      codeRef.current?.focus();
    }
  }, [otp.challengeId]);

  // Link replaced (404) or quotation no longer open (409): the page's details are out of date.
  useEffect(() => {
    if (otp.error?.status === 404 || otp.error?.status === 409) {
      onStale();
    }
  }, [otp.error, onStale]);

  function choose(next: CustomerAction | null) {
    // Codes are tied to one action, so switching starts again.
    otp.reset();
    setAction(next);
    setCode("");
    setCodeError(null);
    setSubmitError(null);
    setWrongAttempts(0);
  }

  async function sendCode() {
    setCodeError(null);
    setSubmitError(null);

    if (await otp.send()) {
      setCode("");
      setWrongAttempts(0);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!action || submitting) {
      return;
    }

    if (!otp.challengeId) {
      await sendCode();
      return;
    }

    if (otp.expired) {
      setCodeError("This code has expired. Request a new code.");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setCodeError("Enter the 6-digit code from the SMS.");
      codeRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setCodeError(null);
    setSubmitError(null);

    try {
      await respondToQuotation(quotation.revisionId, action, { token, challengeId: otp.challengeId, code });
      onResponded(action);
    } catch (caught) {
      const error = caught instanceof ApiError ? caught : new ApiError("Something went wrong. Please try again.", null);

      if (error.status === 400 && error.fieldErrors.length === 0) {
        const attempts = wrongAttempts + 1;
        setWrongAttempts(attempts);
        setCode("");
        setCodeError(
          attempts >= MAX_CODE_ATTEMPTS
            ? "Too many incorrect attempts for this code. Request a new code."
            : "That code didn't work. Check the SMS and try again, or request a new code.",
        );
        codeRef.current?.focus();
      } else if (error.status === 404 || error.status === 409) {
        onStale();
      } else {
        setSubmitError(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!action) {
    return (
      <div className="response-choices" role="group" aria-label="Your response">
        <button type="button" className="button button--accent" onClick={() => choose("accept")}>
          {ACTIONS.accept.label}
        </button>
        <button type="button" className="button button--secondary" onClick={() => choose("request-revision")}>
          {ACTIONS["request-revision"].label}
        </button>
        <button type="button" className="button button--secondary" onClick={() => choose("reject")}>
          {ACTIONS.reject.label}
        </button>
      </div>
    );
  }

  const busy = submitting || otp.sending;
  const codeLocked = wrongAttempts >= MAX_CODE_ATTEMPTS || otp.expired;
  const details = ACTIONS[action];

  return (
    <form className="response-form" onSubmit={submit} noValidate>
      <h3 className="response-form__title">{details.label}</h3>
      <p>{details.explain}</p>
      <p className="muted">To confirm it's you, we'll send a one-time code to the mobile number on your enquiry.</p>

      {otp.error && otp.error.status !== 404 && otp.error.status !== 409 && (
        <StatusMessage tone="error" title="The code couldn't be sent">
          <p>{otp.error.message}</p>
          {otp.error.status === 429 && <p>For your security we limit how often codes can be sent. Please wait and try again.</p>}
        </StatusMessage>
      )}

      {otp.hasChallenge && (
        <div className="otp-step">
          <OtpCodeStep
            sentTo="the mobile number on your enquiry"
            expired={otp.expired}
            expiresIn={otp.expiresIn}
            resendIn={otp.resendIn}
            sending={otp.sending}
            code={code}
            codeError={codeError}
            disabled={submitting || codeLocked}
            inputRef={codeRef}
            onCodeChange={(value) => {
              setCode(value);
              setCodeError(null);
            }}
            onResend={sendCode}
          />
        </div>
      )}

      {submitError && (
        <StatusMessage tone="error" title="Your response wasn't sent">
          <p>{submitError}</p>
        </StatusMessage>
      )}

      <div className="form-actions">
        {otp.hasChallenge ? (
          <button type="submit" className="button button--accent" disabled={busy || codeLocked}>
            {submitting ? "Sending…" : details.confirm}
          </button>
        ) : (
          <button type="submit" className="button button--accent" disabled={busy}>
            {otp.sending ? "Sending code…" : "Send verification code"}
          </button>
        )}
        <button type="button" className="button button--secondary" disabled={submitting} onClick={() => choose(null)}>
          Choose a different response
        </button>
      </div>
    </form>
  );
}
