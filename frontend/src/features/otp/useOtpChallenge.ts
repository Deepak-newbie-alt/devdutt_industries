import { useCallback, useState } from "react";
import { ApiError } from "../../api/client";
import { useCountdown } from "../../hooks/useCountdown";
import type { OtpChallenge } from "../../types/api";

type ActiveChallenge = {
  challengeId: string;
  expiresAt: number;
  resendAt: number;
};

// Tracks one OTP challenge: requesting (and re-requesting) a code, when it expires,
// and when another may be requested. Shared by the enquiry and quotation-response flows.
export function useOtpChallenge(request: () => Promise<OtpChallenge>) {
  const [challenge, setChallenge] = useState<ActiveChallenge | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const expiresIn = useCountdown(challenge?.expiresAt ?? null);
  const resendIn = useCountdown(challenge?.resendAt ?? null);

  const send = useCallback(async () => {
    setSending(true);
    setError(null);

    try {
      const result = await request();
      const now = Date.now();
      // A new code replaces the previous one; the backend retires older codes.
      setChallenge({
        challengeId: result.challengeId,
        expiresAt: now + result.expiresInSeconds * 1000,
        resendAt: now + result.resendAfterSeconds * 1000,
      });
      return true;
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Could not send the code. Please try again.", null));
      return false;
    } finally {
      setSending(false);
    }
  }, [request]);

  const reset = useCallback(() => {
    setChallenge(null);
    setError(null);
  }, []);

  return {
    challengeId: challenge?.challengeId ?? null,
    hasChallenge: challenge !== null,
    expired: challenge !== null && expiresIn === 0,
    expiresIn,
    resendIn,
    sending,
    error,
    send,
    reset,
  };
}
