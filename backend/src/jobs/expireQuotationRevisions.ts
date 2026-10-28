
import cron from "node-cron";
import prisma from "../lib/prisma.js";
import { getTodayInIndiaDbDate } from "../utils/dateOnly.js";

export const expireQuotationRevisions = async () => {
    const now = getTodayInIndiaDbDate();

    const result = await prisma.quotationRevision.updateMany({
        where: {
            quotationRevisionStatus: "SENT",
            validUntil: {
                lt: now,
            },
        },
        data: {
            quotationRevisionStatus: "EXPIRED",
        },
    });

    if (result.count > 0) {
        console.log(
            `Expired ${result.count} quotation revision(s)`
        );
    }
};

export const startQuotationExpiryJob = () => {
    cron.schedule("* * * * *", async () => {
        try {
            await expireQuotationRevisions();
        } catch (error) {
            console.error(
                "Quotation expiry job failed:",
                error
            );
        }
    });
};
