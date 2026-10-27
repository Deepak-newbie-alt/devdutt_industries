import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";

import prisma from "../lib/prisma.js";
import { smsSender } from "../lib/sms.js";
import ApiError from "../utils/ApiError.js";
import { getTodayInIndiaDbDate } from "../utils/dateOnly.js";
import type { CustomerOtpPurpose, Prisma } from "../generated/prisma/client.js";

const CODE_TTL_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;
const HOUR_MS = 60 * 60 * 1000;
const MAX_PER_PHONE_PER_HOUR = 5;
const MAX_PER_REVISION_PER_HOUR = 5;
const MAX_PER_IP_PER_HOUR = 20;

const QUOTATION_PURPOSES = [
    "QUOTATION_ACCEPT",
    "QUOTATION_REJECT",
    "QUOTATION_REQUEST_REVISION"
] satisfies CustomerOtpPurpose[];

type TquotationOtpPurpose = (typeof QUOTATION_PURPOSES)[number];

export type TotpTarget =
    | { purpose: "INQUIRY_SUBMISSION"; phoneNumber: string }
    | { purpose: TquotationOtpPurpose; revisionId: number };

// What the action request implies; every field must match the challenge.
export type TotpExpectation = {
    purpose: CustomerOtpPurpose;
    phoneNumber?: string;
    resourceId?: number;
};

const otpSecret = process.env.OTP_SECRET;

if (!otpSecret || otpSecret.length < 32) {
    throw new Error("OTP_SECRET must be set to at least 32 characters");
}

function hmac(value: string): string {
    return createHmac("sha256", otpSecret!).update(value).digest("hex");
}

function hashCode(challengeId: string, code: string): string {
    return hmac(`code:${challengeId}:${code}`);
}

function hashesMatch(a: string, b: string): boolean {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

function invalidCode(): ApiError {
    return new ApiError(400, "Invalid or expired verification code");
}

function tooManyRequests(): ApiError {
    return new ApiError(429, "Too many requests. Try again later.");
}

// Phone of a quotation the customer may still respond to; null when unknown or ineligible.
async function findQuotationPhone(revisionId: number): Promise<string | null> {
    const revision = await prisma.quotationRevision.findFirst({
        where: {
            id: revisionId,
            quotationRevisionStatus: "SENT",
            validUntil: {
                gte: getTodayInIndiaDbDate()
            }
        },
        select: {
            quotation: {
                select: {
                    inquiry: {
                        select: {
                            phoneNumber: true
                        }
                    }
                }
            }
        }
    });

    return revision?.quotation.inquiry.phoneNumber ?? null;
}

// Limits use only keys known before any eligibility lookup, so a 429 reveals nothing.
async function assertWithinLimits(
    tx: Prisma.TransactionClient,
    target: TotpTarget,
    requestIpHash: string,
    now: Date
) {
    const hourAgo = new Date(now.getTime() - HOUR_MS);
    const cooldownStart = new Date(now.getTime() - RESEND_COOLDOWN_SECONDS * 1000);

    const ipCount = await tx.customerOtpChallenge.count({
        where: {
            requestIpHash,
            createdAt: { gte: hourAgo }
        }
    });

    if (ipCount >= MAX_PER_IP_PER_HOUR) {
        throw tooManyRequests();
    }

    if (target.purpose === "INQUIRY_SUBMISSION") {
        const phoneCount = await tx.customerOtpChallenge.count({
            where: {
                purpose: "INQUIRY_SUBMISSION",
                phoneNumber: target.phoneNumber,
                createdAt: { gte: hourAgo }
            }
        });

        const recentCount = await tx.customerOtpChallenge.count({
            where: {
                purpose: "INQUIRY_SUBMISSION",
                phoneNumber: target.phoneNumber,
                createdAt: { gte: cooldownStart }
            }
        });

        if (phoneCount >= MAX_PER_PHONE_PER_HOUR || recentCount > 0) {
            throw tooManyRequests();
        }

        return;
    }

    const revisionCount = await tx.customerOtpChallenge.count({
        where: {
            purpose: { in: QUOTATION_PURPOSES },
            resourceId: target.revisionId,
            createdAt: { gte: hourAgo }
        }
    });

    const recentCount = await tx.customerOtpChallenge.count({
        where: {
            purpose: target.purpose,
            resourceId: target.revisionId,
            createdAt: { gte: cooldownStart }
        }
    });

    if (revisionCount >= MAX_PER_REVISION_PER_HOUR || recentCount > 0) {
        throw tooManyRequests();
    }
}

export const CustomerOtpService = {
    requestChallenge: async (target: TotpTarget, ip: string) => {
        const requestIpHash = hmac(`ip:${ip}`);
        const isInquiry = target.purpose === "INQUIRY_SUBMISSION";

        const phoneNumber = isInquiry
            ? target.phoneNumber
            : await findQuotationPhone(target.revisionId);
        const resourceId = isInquiry ? null : target.revisionId;

        const targetKey = isInquiry
            ? `${target.purpose}:${target.phoneNumber}`
            : `${target.purpose}:${target.revisionId}`;

        const lockKeys = [
            `otp:ip:${requestIpHash}`,
            `otp:target:${targetKey}`,
            isInquiry
                ? `otp:phone:${target.phoneNumber}`
                : `otp:revision:${target.revisionId}`
        ].sort();

        const challengeId = randomUUID();
        const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
        const now = new Date();

        // Serialize requests sharing a limit key so concurrent requests can't all pass the counts.
        await prisma.$transaction(async (tx) => {
            for (const key of lockKeys) {
                await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
            }

            await assertWithinLimits(tx, target, requestIpHash, now);

            // Unsent until delivery succeeds; placeholders (no phone) are never usable.
            await tx.customerOtpChallenge.create({
                data: {
                    id: challengeId,
                    purpose: target.purpose,
                    phoneNumber,
                    resourceId,
                    codeHash: phoneNumber
                        ? hashCode(challengeId, code)
                        : hmac(randomBytes(32).toString("hex")),
                    expiresAt: new Date(now.getTime() + CODE_TTL_SECONDS * 1000),
                    requestIpHash
                }
            });
        });

        const response = {
            challengeId,
            expiresInSeconds: CODE_TTL_SECONDS,
            resendAfterSeconds: RESEND_COOLDOWN_SECONDS
        };

        // Ineligible or unknown quotation: same response, nothing sent.
        if (!phoneNumber) {
            return response;
        }

        try {
            await smsSender.send(
                `+91${phoneNumber}`,
                `${code} is your Devdutt Industries verification code. It expires in 5 minutes.`
            );
        } catch (error) {
            console.error("OTP SMS delivery failed:", error);

            // Only the new challenge is dropped; an earlier code stays usable.
            await prisma.customerOtpChallenge.update({
                where: { id: challengeId },
                data: { expiresAt: new Date() }
            });

            throw new ApiError(503, "Could not send verification code. Try again later.");
        }

        // Delivered: activate it and retire older codes for the same purpose and target.
        const sentAt = new Date();

        await prisma.$transaction([
            prisma.customerOtpChallenge.update({
                where: { id: challengeId },
                data: { sentAt }
            }),
            prisma.customerOtpChallenge.updateMany({
                where: {
                    id: { not: challengeId },
                    purpose: target.purpose,
                    ...(isInquiry ? { phoneNumber } : { resourceId }),
                    consumedAt: null,
                    expiresAt: { gt: sentAt }
                },
                data: { expiresAt: sentAt }
            })
        ]);

        return response;
    },

    // Runs outside the action transaction so a failed attempt is counted even if the action fails.
    checkCode: async (
        challengeId: string,
        code: string,
        expected: TotpExpectation
    ) => {
        const counted = await prisma.customerOtpChallenge.updateMany({
            where: {
                id: challengeId,
                sentAt: { not: null },
                consumedAt: null,
                expiresAt: { gt: new Date() },
                attempts: { lt: MAX_ATTEMPTS }
            },
            data: {
                attempts: { increment: 1 }
            }
        });

        if (counted.count === 0) {
            throw invalidCode();
        }

        const challenge = await prisma.customerOtpChallenge.findUniqueOrThrow({
            where: { id: challengeId }
        });

        const isValid =
            hashesMatch(challenge.codeHash, hashCode(challengeId, code)) &&
            challenge.purpose === expected.purpose &&
            (expected.phoneNumber === undefined ||
                challenge.phoneNumber === expected.phoneNumber) &&
            (expected.resourceId === undefined ||
                challenge.resourceId === expected.resourceId);

        if (!isValid) {
            throw invalidCode();
        }
    },

    // First statement of the action's transaction: single use, atomic with the action.
    consume: async (tx: Prisma.TransactionClient, challengeId: string) => {
        const now = new Date();

        const result = await tx.customerOtpChallenge.updateMany({
            where: {
                id: challengeId,
                sentAt: { not: null },
                consumedAt: null,
                expiresAt: { gt: now }
            },
            data: {
                consumedAt: now
            }
        });

        if (result.count !== 1) {
            throw invalidCode();
        }
    }
};
