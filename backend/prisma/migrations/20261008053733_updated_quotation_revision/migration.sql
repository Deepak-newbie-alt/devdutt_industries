/*
  Warnings:

  - You are about to drop the column `slug` on the `quotationrevisions` table. All the data in the column will be lost.
  - Added the required column `grandTotal` to the `quotationrevisions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `taxableAmount` to the `quotationrevisions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `quotationrevisions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "quotationrevisions" DROP COLUMN "slug",
ADD COLUMN     "cgstAmount" DECIMAL(12,2),
ADD COLUMN     "cgstRate" DECIMAL(5,2),
ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
ADD COLUMN     "grandTotal" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "igstAmount" DECIMAL(12,2),
ADD COLUMN     "igstRate" DECIMAL(5,2),
ADD COLUMN     "sgstAmount" DECIMAL(12,2),
ADD COLUMN     "sgstRate" DECIMAL(5,2),
ADD COLUMN     "taxableAmount" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
