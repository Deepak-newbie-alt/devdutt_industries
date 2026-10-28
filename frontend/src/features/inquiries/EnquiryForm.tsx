import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import { requestInquiryCode, submitInquiry } from "../../api/inquiries";
import type { CreatedInquiry } from "../../types/api";
import { OtpCodeStep } from "../otp/OtpCodeStep";
import { useOtpChallenge } from "../otp/useOtpChallenge";
import { StatusMessage } from "../../components/ui/StatusMessage";

const REQUIREMENT_MAX = 1200;
const INDIAN_MOBILE = /^[6-9]\d{9}$/;
// The backend allows 5 wrong attempts per code; after that every attempt fails.
const MAX_CODE_ATTEMPTS = 5;

// Accepts "98765 43210", "+91 98765 43210", "09876543210" and keeps the 10-digit number.
// Any other length keeps every digit so validation reports it instead of a different number being used.
function normalisePhone(input: string) {
  const digits = input.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }

  return digits;
}

type EnquiryFormProps = {
  productId: number;
  onSubmitted: (result: CreatedInquiry, phoneNumber: string) => void;
};

export function EnquiryForm({ productId, onSubmitted }: EnquiryFormProps) {
  const [requirement, setRequirement] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [requirementError, setRequirementError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  const request = useCallback(() => requestInquiryCode(phone), [phone]);
  const otp = useOtpChallenge(request);

  // Each new code: move focus to the code field once it is on screen.
  useEffect(() => {
    if (otp.challengeId) {
      codeRef.current?.focus();
    }
  }, [otp.challengeId]);

  function validateDetails() {
    const text = requirement.trim();
    const nextRequirementError =
      text === "" ? "Describe what you need so our team can prepare a quotation." : null;
    const nextPhoneError = INDIAN_MOBILE.test(phone)
      ? null
      : "Enter a 10-digit Indian mobile number, for example 98765 43210.";

    setRequirementError(nextRequirementError);
    setPhoneError(nextPhoneError);
    return !nextRequirementError && !nextPhoneError;
  }

  async function sendCode() {
    if (!validateDetails() || otp.sending) {
      return;
    }

    setCodeError(null);
    setSubmitError(null);

    if (await otp.send()) {
      setSentTo(phone);
      setCode("");
      setWrongAttempts(0);
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
    } else if (otp.error && next !== phone) {
      // A failed send was about the previous number.
      otp.reset();
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    // Before a code exists, the main button sends one.
    if (!otp.challengeId) {
      await sendCode();
      return;
    }

    if (!validateDetails()) {
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
      const result = await submitInquiry({
        productId,
        phoneNumber: phone,
        requirement: requirement.trim(),
        challengeId: otp.challengeId,
        code,
      });
      onSubmitted(result, phone);
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
          if (field.field.endsWith("requirement")) setRequirementError(field.message);
          else if (field.field.endsWith("phoneNumber")) setPhoneError(field.message);
          else if (field.field.endsWith("code")) setCodeError(field.message);
          else setSubmitError(field.message);
        }
      } else {
        setSubmitError(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const codeLocked = wrongAttempts >= MAX_CODE_ATTEMPTS || otp.expired;
  const busy = submitting || otp.sending;

  return (
    <form className="enquiry-form" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="requirement" className="field__label">
          Your requirement
        </label>
        <p id="requirement-hint" className="field__hint">
          Pipe or tube sizes, material, quantity, and where the machine will be used.
        </p>
        <textarea
          id="requirement"
          className="input textarea"
          rows={6}
          maxLength={REQUIREMENT_MAX}
          value={requirement}
          disabled={submitting}
          aria-invalid={requirementError ? true : undefined}
          aria-describedby={["requirement-hint", "requirement-count", requirementError ? "requirement-error" : ""]
            .filter(Boolean)
            .join(" ")}
          onChange={(event) => {
            setRequirement(event.target.value);
            setRequirementError(null);
          }}
        />
        <p id="requirement-count" className="field__counter">
          {requirement.length} / {REQUIREMENT_MAX}
        </p>
        {requirementError && (
          <p id="requirement-error" className="field__error">
            {requirementError}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="phone" className="field__label">
          Mobile number
        </label>
        <p id="phone-hint" className="field__hint">
          We'll send a one-time code to confirm it's yours. Our team will contact you on this number.
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
            disabled={submitting || codeLocked}
            inputRef={codeRef}
            onCodeChange={(value) => {
              setCode(value);
              setCodeError(null);
            }}
            onResend={sendCode}
          />

          {submitError && (
            <StatusMessage tone="error" title="Your enquiry wasn't sent">
              <p>{submitError}</p>
            </StatusMessage>
          )}

          <div className="form-actions">
            <button type="submit" className="button button--accent" disabled={busy || codeLocked}>
              {submitting ? "Sending enquiry…" : "Send enquiry"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
