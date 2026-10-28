-- AlterTable
ALTER TABLE "quotationrevisions" ADD COLUMN     "customerAccessTokenHash" CHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "quotationrevisions_customerAccessTokenHash_key" ON "quotationrevisions"("customerAccessTokenHash");

