// Delivery channel for customer OTPs. A real provider is added as another SmsSender.
export type SmsSender = {
    send(to: string, text: string): Promise<void>;
};

// Development only: prints the message to the server log instead of sending it.
const consoleSmsSender: SmsSender = {
    async send(to, text) {
        console.log(`[sms:console] to ${to}: ${text}`);
    },
};

function getSmsSender(): SmsSender {
    const provider = process.env.SMS_PROVIDER ?? "console";

    if (provider === "console") {
        if (process.env.NODE_ENV === "production") {
            throw new Error("SMS_PROVIDER=console is not allowed in production");
        }

        return consoleSmsSender;
    }

    throw new Error(`Unsupported SMS_PROVIDER: ${provider}`);
}

// Resolved at startup so a misconfigured provider fails fast.
export const smsSender = getSmsSender();
