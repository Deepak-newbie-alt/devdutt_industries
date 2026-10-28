import type { ReactNode, Ref } from "react";
import { StatusMessage } from "../../components/ui/StatusMessage";
import { formatSeconds } from "../../hooks/useCountdown";
import { OtpCodeInput } from "./OtpCodeInput";

type OtpCodeStepProps = {
  // Who the code went to, e.g. "+91 98765 43210" or "the mobile number on your enquiry".
  sentTo: ReactNode;
  expired: boolean;
  expiresIn: number;
  resendIn: number;
  sending: boolean;
  code: string;
  codeError: string | null;
  disabled: boolean;
  inputRef: Ref<HTMLInputElement>;
  onCodeChange: (value: string) => void;
  onResend: () => void;
};

// The "enter your code" part of an OTP flow: where it went, when it expires,
// the code field, and requesting a new code once the cooldown has passed.
export function OtpCodeStep({
  sentTo,
  expired,
  expiresIn,
  resendIn,
  sending,
  code,
  codeError,
  disabled,
  inputRef,
  onCodeChange,
  onResend,
}: OtpCodeStepProps) {
  return (
    <>
      <StatusMessage tone="info">
        <p>
          We sent a 6-digit code to {sentTo}. {expired ? "It has expired." : `It expires in ${formatSeconds(expiresIn)}.`}
        </p>
      </StatusMessage>

      <div className="field">
        <label htmlFor="otp-code" className="field__label">
          Verification code
        </label>
        <OtpCodeInput
          ref={inputRef}
          id="otp-code"
          value={code}
          disabled={disabled}
          invalid={Boolean(codeError)}
          errorId="otp-error"
          onChange={onCodeChange}
        />
        {codeError && (
          <p id="otp-error" className="field__error" role="alert">
            {codeError}
          </p>
        )}
      </div>

      <p className="resend">
        {resendIn > 0 ? (
          <span className="muted">You can request a new code in {formatSeconds(resendIn)}.</span>
        ) : (
          <button type="button" className="link-button" disabled={sending} onClick={onResend}>
            {sending ? "Sending…" : "Send a new code"}
          </button>
        )}
      </p>
    </>
  );
}
