import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import { lookupInquiryHistory, requestHistoryCode } from "../../api/inquiries";
import { StatusMessage } from "../../components/ui/StatusMessage";
import type { CustomerInquiryHistory } from "../../types/api";
import { OtpCodeStep } from "../otp/OtpCodeStep";
import { useOtpChallenge } from "../otp/useOtpChallenge";
import { INDIAN_MOBILE, MAX_CODE_ATTEMPTS, normalisePhone, PHONE_ERROR } from "./phone";

type HistoryLookupFormProps = {
  onFound: (history: CustomerInquiryHistory, phoneNumber: string) => void;
};

// Phone number, then the code sent to it. The enquiries are only fetched with a valid code,
// and nothing (number, code or results) is saved in the browser.
export function HistoryLookupForm({ onFound }: HistoryLookupFormProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [looking, setLooking] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  // Set synchronously, so a second click before the re-render can't start another request.
  const pending = useRef(false);

  const request = useCallback(() => requestHistoryCode(phone), [phone]);
  const otp = useOtpChallenge(request);

  // Each new code: move focus to the code field once it is on screen.
  useEffect(() => {
    if (otp.challengeId) {
      codeRef.current?.focus();
    }
  }, [otp.challengeId]);

  async function sendCode() {
    if (pending.current) {
      return;
    }

    if (!INDIAN_MOBILE.test(phone)) {
      setPhoneError(PHONE_ERROR);
      return;
    }

    setCodeError(null);
    setLookupError(null);
    pending.current = true;

    try {
      if (await otp.send()) {
        setSentTo(phone);
        setCode("");
        setWrongAttempts(0);
      }
    } finally {
      pending.current = false;
    }
  }

  function changePhone(value: string) {
    const next = normalisePhone(value);
    setPhone(next);
    setPhoneError(null);

    // A code only works for the number it was sent to.
    if (sentTo !== null && next !== sentTo) {
      otp.reset();
      setSentTo(null);
      setCode("");
      setCodeError(null);
      setLookupError(null);
    } else if (otp.error && next !== phone) {
      // A failed send was about the previous number.
      otp.reset();
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (pending.current) {
      return;
    }

    // Before a code exists, the main button sends one.
    if (!otp.challengeId || sentTo === null) {
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

    pending.current = true;
    setLooking(true);
    setCodeError(null);
    setLookupError(null);

    try {
      const history = await lookupInquiryHistory({ phoneNumber: sentTo, challengeId: otp.challengeId, code });
      onFound(history, sentTo);
    } catch (caught) {
      const error = caught instanceof ApiError ? caught : new ApiError("Something went wrong. Please try again.", null);

      if (error.status === 400 && error.fieldErrors.length === 0) {
        // Wrong, expired or already used code: the backend gives the same answer for all.
        const attempts = wrongAttempts + 1;
        setWrongAttempts(attempts);
        setCode("");
        setCodeError(
          attempts >= MAX_CODE_ATTEMPTS
            ? "Too many incorrect attempts for this code. Request a new code."
            : "That code didn't work. Check the SMS and try again, or request a new code.",
        );
        codeRef.current?.focus();
      } else if (error.fieldErrors.length > 0) {
        for (const field of error.fieldErrors) {
          if (field.field.endsWith("phoneNumber")) setPhoneError(field.message);
          else if (field.field.endsWith("code")) setCodeError(field.message);
          else setLookupError(field.message);
        }
      } else {
        // Network or server problem: the code may still be valid, so it stays in the field.
        setLookupError(error.message);
      }
    } finally {
      pending.current = false;
      setLooking(false);
    }
  }

  const codeLocked = wrongAttempts >= MAX_CODE_ATTEMPTS || otp.expired;
  const busy = looking || otp.sending;

  return (
    <form className="enquiry-form" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="phone" className="field__label">
          Mobile number
        </label>
        <p id="phone-hint" className="field__hint">
          The number you used when you sent your enquiries. We'll send a one-time code to confirm it's yours.
        </p>
        <div className="phone-input">
          <span className="phone-input__prefix" aria-hidden="true">
            +91
          </span>
          <input
            id="phone"
            className="input"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={phone}
            disabled={busy}
            aria-invalid={phoneError ? true : undefined}
            aria-describedby={["phone-hint", phoneError ? "phone-error" : ""].filter(Boolean).join(" ")}
            onChange={(event) => changePhone(event.target.value)}
          />
        </div>
        {phoneError && (
          <p id="phone-error" className="field__error">
            {phoneError}
          </p>
        )}
      </div>

      {otp.error && (
        <StatusMessage tone="error" title="The code couldn't be sent">
          <p>{otp.error.message}</p>
          {otp.error.status === 429 && <p>For your security we limit how often codes can be sent. Please wait and try again.</p>}
        </StatusMessage>
      )}

      {!otp.hasChallenge ? (
        <div className="form-actions">
          <button type="submit" className="button button--accent" disabled={busy}>
            {otp.sending ? "Sending code…" : "Send verification code"}
          </button>
        </div>
      ) : (
        <div className="otp-step">
          <OtpCodeStep
            sentTo={<strong>+91 {sentTo}</strong>}
            expired={otp.expired}
            expiresIn={otp.expiresIn}
            resendIn={otp.resendIn}
            sending={otp.sending}
            code={code}
            codeError={codeError}
            disabled={looking || codeLocked}
            inputRef={codeRef}
            onCodeChange={(value) => {
              setCode(value);
              setCodeError(null);
            }}
            onResend={sendCode}
          />

          {lookupError && (
            <StatusMessage tone="error" title="Your enquiries couldn't be loaded">
              <p>{lookupError}</p>
            </StatusMessage>
          )}

          <div className="form-actions">
            <button type="submit" className="button button--accent" disabled={busy || codeLocked}>
              {looking ? "Checking…" : "Show my enquiries"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
