// Express "trust proxy" from TRUST_PROXY. It decides whether req.ip comes from
// X-Forwarded-For, which the OTP per-IP limits rely on. Trusting a proxy that
// isn't really in front of the app lets clients spoof their IP.
//
//   unset / "false"       trust nothing; req.ip is the direct peer (default, local dev)
//   "1", "2", ...         trust that many proxy hops in front of the app
//   "10.0.0.1, loopback"  trust only these addresses, CIDR ranges or Express
//                         presets (loopback, linklocal, uniquelocal)
//
// "true" (trust every hop) is rejected: any client could then set its own IP.
export function getTrustProxySetting(): false | number | string {
    const value = process.env.TRUST_PROXY?.trim();

    if (!value || value === "false") {
        return false;
    }

    if (value === "true") {
        throw new Error(
            "TRUST_PROXY=true is not allowed; set the proxy hop count or the proxy addresses"
        );
    }

    if (/^\d+$/.test(value)) {
        const hops = Number(value);

        if (hops < 1) {
            return false;
        }

        return hops;
    }

    return value;
}
