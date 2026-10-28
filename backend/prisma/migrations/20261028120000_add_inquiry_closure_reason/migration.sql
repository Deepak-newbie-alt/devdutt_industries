-- CreateEnum
CREATE TYPE "InquiryClosureReason" AS ENUM ('DUPLICATE', 'CUSTOMER_UNREACHABLE', 'CUSTOMER_NOT_INTERESTED', 'NOT_OUR_PRODUCT', 'INVALID_INQUIRY', 'OTHER');

-- AlterTable
ALTER TABLE "inquiryactivities" ADD COLUMN     "closureReason" "InquiryClosureReason";

