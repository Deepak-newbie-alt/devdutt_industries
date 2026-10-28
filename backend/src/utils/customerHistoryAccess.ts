import { createHmac, timingSafeEqual } from "node:crypto";
import ApiError from "./ApiError.js";

// Read-only access to one phone number's inquiries, issued after an INQUIRY_HISTORY_LOOKUP code is
// verified. Signed, not stored: it can't be revoked early, so it is short-lived, and it is accepted
// only by the customer history detail and document routes (never staff or quotation-action routes).
export const HISTORY_ACCESS_TTL_SECONDS = 15 * 60;

const VERSION = 1;
const SCOPE = "inquiry-history:read";

type Tpayload = { v: number; scope: string; phone: string; exp: number };

const otpSecret = process.env.OTP_SECRET;

if (!otpSecret || otpSecret.length < 32) {
    throw new Error("OTP_SECRET must be set to at least 32 characters");
}

// Its own key, derived from OTP_SECRET, so these signatures can't match an OTP or IP hash.
const signingKey = createHmac("sha256", otpSecret).update("customer-history-access:v1").digest();

function sign(payload: string): Buffer {
    return createHmac("sha256", signingKey).update(payload).digest();
}

function expired(): ApiError {
    return new ApiError(401, "Your verification has expired. Verify your number again.");
}

export function issueHistoryAccess(phone: string) {
    const payload: Tpayload = {
        v: VERSION,
        scope: SCOPE,
        phone,
        exp: Math.floor(Date.now() / 1000) + HISTORY_ACCESS_TTL_SECONDS
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");

    return {
        token: `${encoded}.${sign(encoded).toString("base64url")}`,
        expiresInSeconds: HISTORY_ACCESS_TTL_SECONDS
    };
}

// The verified phone number, or 401 for anything forged, altered, expired or out of scope.
export function verifyHistoryAccess(token: string): string {
    const [encoded, signature, extra] = token.split(".");

    if (!encoded || !signature || extra !== undefined) {
        throw expired();
    }

    const expected = sign(encoded);
    const given = Buffer.from(signature, "base64url");

    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
        throw expired();
    }

    let payload: Partial<Tpayload>;

    try {
        payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    } catch {
        throw expired();
    }

    if (
        payload.v !== VERSION ||
        payload.scope !== SCOPE ||
        typeof payload.phone !== "string" ||
        typeof payload.exp !== "number" ||
        payload.exp <= Math.floor(Date.now() / 1000)
    ) {
        throw expired();
    }

    return payload.phone;
}
