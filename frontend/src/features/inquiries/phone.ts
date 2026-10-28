// Customer mobile numbers, as the backend accepts them: 10 digits, starting 6–9, no country code.
export const INDIAN_MOBILE = /^[6-9]\d{9}$/;

export const PHONE_ERROR = "Enter a 10-digit Indian mobile number, for example 98765 43210.";

// The backend allows 5 wrong attempts per code; after that every attempt fails.
export const MAX_CODE_ATTEMPTS = 5;

// Accepts "98765 43210", "+91 98765 43210", "09876543210" and keeps the 10-digit number.
// Any other length keeps every digit so validation reports it instead of a different number being used.
export function normalisePhone(input: string) {
  const digits = input.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }

  return digits;
}
