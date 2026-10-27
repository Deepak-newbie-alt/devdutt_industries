import cron from "node-cron";
import prisma from "../lib/prisma.js";

// Challenges expire after minutes; rows are kept a week only for rate limits and debugging.
const RETENTION_DAYS = 7;

export const cleanupCustomerOtpChallenges = async () => {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

    // Only OTP challenges; no business record references this table.
    const result = await prisma.customerOtpChallenge.deleteMany({
        where: {
            createdAt: {
                lt: cutoff,
            },
        },
    });

    if (result.count > 0) {
        console.log(
            `Deleted ${result.count} customer OTP challenge(s) older than ${RETENTION_DAYS} days`
        );
    }
};

let isScheduled = false;

export const startCustomerOtpCleanupJob = () => {
    // Register at most once per process, even if called again.
    if (isScheduled) {
        return;
    }

    isScheduled = true;

    // Daily at 03:00 IST; a slow run is never overlapped by the next one.
    cron.schedule("0 3 * * *", async () => {
        try {
            await cleanupCustomerOtpChallenges();
        } catch (error) {
            console.error(
                "Customer OTP cleanup job failed:",
                error
            );
        }
    }, {
        timezone: "Asia/Kolkata",
        noOverlap: true,
    });
};
