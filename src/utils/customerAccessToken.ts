import { createHash, randomBytes } from "node:crypto";

// Customer response links carry a random token. Only its SHA-256 is stored, so the
// link is shown once (on send or reissue) and the database alone can't rebuild it.
const quotationLinkBase = process.env.CUSTOMER_QUOTATION_URL;

if (!quotationLinkBase || !URL.canParse(quotationLinkBase)) {
    throw new Error("CUSTOMER_QUOTATION_URL must be set to the customer quotation page URL");
}

export function hashCustomerAccessToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

// 256 random bits, base64url: 43 characters.
export function generateCustomerAccessToken() {
    const token = randomBytes(32).toString("base64url");

    return {
        token,
        tokenHash: hashCustomerAccessToken(token)
    };
}

// The token goes in the fragment so browsers don't send it to the web server or in Referer.
export function buildCustomerQuotationLink(token: string): string {
    const url = new URL(quotationLinkBase!);
    url.hash = `token=${token}`;

    return url.toString();
}
