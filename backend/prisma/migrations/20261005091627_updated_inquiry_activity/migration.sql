-- DropForeignKey
ALTER TABLE "inquiryactivities" DROP CONSTRAINT "inquiryactivities_inquiryId_fkey";

-- DropForeignKey
ALTER TABLE "inquiryactivities" DROP CONSTRAINT "inquiryactivities_userId_fkey";

-- AddForeignKey
ALTER TABLE "inquiryactivities" ADD CONSTRAINT "inquiryactivities_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiryactivities" ADD CONSTRAINT "inquiryactivities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
