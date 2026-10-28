// The customer link looks like /quotation#token=<43 base64url characters>.
// The fragment is never sent to the server or in the Referer header.
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/;

export type LinkToken =
  | { kind: "missing" }
  | { kind: "malformed" }
  | { kind: "valid"; token: string };

export function readLinkToken(hash: string): LinkToken {
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("token");

  if (!token) {
    return { kind: "missing" };
  }

  return TOKEN_FORMAT.test(token) ? { kind: "valid", token } : { kind: "malformed" };
}

// Keep the token out of the address bar, browser history entries and screenshots.
// React Router's history state is kept so navigation keeps working.
export function removeTokenFromAddressBar() {
  if (window.location.hash) {
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  }
}
