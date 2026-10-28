import { forwardRef } from "react";

type OtpCodeInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  errorId?: string;
  hintId?: string;
  invalid?: boolean;
};

// Six-digit code field. Accepts pasted codes with spaces and keeps digits only.
export const OtpCodeInput = forwardRef<HTMLInputElement, OtpCodeInputProps>(function OtpCodeInput(
  { id, value, onChange, disabled, errorId, hintId, invalid },
  ref,
) {
  const describedBy = [hintId, invalid ? errorId : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <input
      ref={ref}
      id={id}
      className="input otp-input"
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      value={value}
      disabled={disabled}
      aria-invalid={invalid ? true : undefined}
      aria-describedby={describedBy}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
    />
  );
});
