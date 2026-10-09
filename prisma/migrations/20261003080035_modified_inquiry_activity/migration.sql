/*
  Warnings:

  - You are about to drop the `Inquiry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InquiryActivity` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Inquiry" DROP CONSTRAINT "Inquiry_productId_fkey";

-- DropForeignKey
ALTER TABLE "Inquiry" DROP CONSTRAINT "Inquiry_salespersonId_fkey";

-- DropForeignKey
ALTER TABLE "InquiryActivity" DROP CONSTRAINT "InquiryActivity_inquiryId_fkey";

-- DropForeignKey
ALTER TABLE "InquiryActivity" DROP CONSTRAINT "InquiryActivity_userId_fkey";

-- DropTable
DROP TABLE "Inquiry";

-- DropTable
DROP TABLE "InquiryActivity";

-- CreateTable
CREATE TABLE "inquiries" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "salespersonId" INTEGER,
    "requirement" VARCHAR(1200) NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiryactivities" (
    "id" SERIAL NOT NULL,
    "inquiryId" INTEGER NOT NULL,
    "userId" INTEGER,
    "activityType" "InquiryActivityType" NOT NULL,
    "note" VARCHAR(350),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiryactivities_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiryactivities" ADD CONSTRAINT "inquiryactivities_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "inquiries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiryactivities" ADD CONSTRAINT "inquiryactivities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
