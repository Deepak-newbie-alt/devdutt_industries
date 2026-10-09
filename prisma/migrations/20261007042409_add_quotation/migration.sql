/*
  Warnings:

  - You are about to drop the column `userId` on the `inquiryactivities` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "inquiryactivities" DROP CONSTRAINT "inquiryactivities_userId_fkey";

-- AlterTable
ALTER TABLE "inquiryactivities" DROP COLUMN "userId",
ADD COLUMN     "salespersonId" INTEGER;

-- CreateTable
CREATE TABLE "quotations" (
    "id" SERIAL NOT NULL,
    "inquiryId" INTEGER NOT NULL,
    "salespersonId" INTEGER NOT NULL,
    "quotationNumber" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotations_inquiryId_key" ON "quotations"("inquiryId");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_quotationNumber_key" ON "quotations"("quotationNumber");

-- AddForeignKey
ALTER TABLE "inquiryactivities" ADD CONSTRAINT "inquiryactivities_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "inquiries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
