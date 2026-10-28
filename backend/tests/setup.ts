// Imported first by helpers.ts, before any service module loads.
import "dotenv/config";

if (process.env.NODE_ENV === "production") {
    throw new Error("The tests create and delete records; they never run with NODE_ENV=production.");
}

// The SMS sender is chosen when src/lib/sms.ts loads. The console sender only logs, so tests
// read verification codes from its log line and never send a real SMS.
process.env.SMS_PROVIDER = "console";
