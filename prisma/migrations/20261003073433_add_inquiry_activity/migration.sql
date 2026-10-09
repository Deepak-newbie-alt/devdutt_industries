-- CreateEnum
CREATE TYPE "InquiryActivityType" AS ENUM ('CREATED', 'CLAIMED', 'CUSTOMER_CONTACTED', 'NOTE_ADDED', 'STATUS_CHANGED');

-- CreateTable
CREATE TABLE "InquiryActivity" (
    "id" SERIAL NOT NULL,
    "inquiryId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "activityType" "InquiryActivityType" NOT NULL,
    "note" VARCHAR(350),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InquiryActivity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InquiryActivity" ADD CONSTRAINT "InquiryActivity_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquiryActivity" ADD CONSTRAINT "InquiryActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
