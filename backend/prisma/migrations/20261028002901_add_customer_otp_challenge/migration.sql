-- CreateEnum
CREATE TYPE "CustomerOtpPurpose" AS ENUM ('INQUIRY_SUBMISSION', 'QUOTATION_ACCEPT', 'QUOTATION_REJECT', 'QUOTATION_REQUEST_REVISION');

-- CreateTable
CREATE TABLE "customerotpchallenges" (
    "id" UUID NOT NULL,
    "purpose" "CustomerOtpPurpose" NOT NULL,
    "phoneNumber" VARCHAR(15),
    "resourceId" INTEGER,
    "codeHash" CHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "requestIpHash" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customerotpchallenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customerotpchallenges_purpose_phoneNumber_createdAt_idx" ON "customerotpchallenges"("purpose", "phoneNumber", "createdAt");

-- CreateIndex
CREATE INDEX "customerotpchallenges_resourceId_createdAt_idx" ON "customerotpchallenges"("resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "customerotpchallenges_requestIpHash_createdAt_idx" ON "customerotpchallenges"("requestIpHash", "createdAt");

