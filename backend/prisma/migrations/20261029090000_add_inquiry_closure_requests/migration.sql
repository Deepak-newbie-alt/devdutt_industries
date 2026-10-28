-- CreateEnum
CREATE TYPE "InquiryClosureRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InquiryActivityType" ADD VALUE 'CLOSURE_REQUESTED';
ALTER TYPE "InquiryActivityType" ADD VALUE 'CLOSURE_APPROVED';
ALTER TYPE "InquiryActivityType" ADD VALUE 'CLOSURE_REJECTED';

-- CreateTable
CREATE TABLE "inquiryclosurerequests" (
    "id" SERIAL NOT NULL,
    "inquiryId" INTEGER NOT NULL,
    "requestedById" INTEGER NOT NULL,
    "note" VARCHAR(350) NOT NULL,
    "status" "InquiryClosureRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" INTEGER,
    "reviewNote" VARCHAR(350),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inquiryclosurerequests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inquiryclosurerequests_status_createdAt_idx" ON "inquiryclosurerequests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "inquiryclosurerequests_inquiryId_status_idx" ON "inquiryclosurerequests"("inquiryId", "status");

-- AddForeignKey
ALTER TABLE "inquiryclosurerequests" ADD CONSTRAINT "inquiryclosurerequests_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "inquiries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiryclosurerequests" ADD CONSTRAINT "inquiryclosurerequests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiryclosurerequests" ADD CONSTRAINT "inquiryclosurerequests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

