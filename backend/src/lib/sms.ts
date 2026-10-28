// Delivery channel for customer OTPs. The backend generates and verifies codes;
// a sender only delivers one. phoneNumber is the 10-digit Indian mobile number
// without country code (validated by customerPhoneSchema); each sender formats it.
export type SmsSender = {
    sendOtp(phoneNumber: string, code: string): Promise<void>;
};

const INDIAN_MOBILE = /^[6-9]\d{9}$/;

function assertIndianMobile(phoneNumber: string) {
    if (!INDIAN_MOBILE.test(phoneNumber)) {
        throw new Error("SMS recipient must be a 10-digit Indian mobile number without country code");
    }
}

// Development only: prints the message to the server log instead of sending it.
const consoleSmsSender: SmsSender = {
    async sendOtp(phoneNumber, code) {
        assertIndianMobile(phoneNumber);
        console.log(`[sms:console] to +91${phoneNumber}: ${code} is your Devdutt Industries verification code. It expires in 5 minutes.`);
    },
};

const MSG91_FLOW_URL = "https://control.msg91.com/api/v5/flow";
const MSG91_TIMEOUT_MS = 10_000;

function requireEnv(name: string): string {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`${name} must be set when SMS_PROVIDER=msg91`);
    }

    return value;
}

// MSG91 Flow API: sends an approved (DLT) template with the code as a variable.
function createMsg91SmsSender(): SmsSender {
    const authKey = requireEnv("MSG91_AUTH_KEY");
    const templateId = requireEnv("MSG91_OTP_TEMPLATE_ID");
    // Name of the template variable that holds the code, as set up in MSG91.
    const codeVariable = requireEnv("MSG91_OTP_TEMPLATE_VARIABLE");

    return {
        async sendOtp(phoneNumber, code) {
            assertIndianMobile(phoneNumber);

            let response: Response;

            try {
                response = await fetch(MSG91_FLOW_URL, {
                    method: "POST",
                    headers: {
                        authkey: authKey,
                        accept: "application/json",
                        "content-type": "application/json",
                    },
                    body: JSON.stringify({
                        template_id: templateId,
                        short_url: "0",
                        // MSG91 expects the country code without "+", e.g. 919XXXXXXXXX.
                        recipients: [{ mobiles: `91${phoneNumber}`, [codeVariable]: code }],
                    }),
                    signal: AbortSignal.timeout(MSG91_TIMEOUT_MS),
                });
            } catch (error) {
                // Timeout or network failure; the SMS may or may not have been sent.
                const reason = error instanceof Error && error.name === "TimeoutError"
                    ? `timed out after ${MSG91_TIMEOUT_MS} ms`
                    : "request failed";
                throw new Error(`MSG91 ${reason}`, { cause: error });
            }

            const body = await response.json().catch(() => null) as { type?: string; message?: string } | null;

            if (!response.ok || body?.type !== "success") {
                throw new Error(
                    `MSG91 rejected the request (HTTP ${response.status}${body?.message ? `: ${body.message}` : ""})`
                );
            }

            // Accepted for delivery only; delivery status comes from MSG91's SMS logs by this id.
            console.log(`MSG91 accepted OTP SMS request ${body.message ?? "(no request id)"}`);
        },
    };
}

function getSmsSender(): SmsSender {
    const provider = process.env.SMS_PROVIDER ?? "console";

    if (provider === "console") {
        if (process.env.NODE_ENV === "production") {
            throw new Error("SMS_PROVIDER=console is not allowed in production");
        }

        return consoleSmsSender;
    }

    if (provider === "msg91") {
        return createMsg91SmsSender();
    }

    throw new Error(`Unsupported SMS_PROVIDER: ${provider}`);
}

// Resolved at startup so a misconfigured provider fails fast.
export const smsSender = getSmsSender();
