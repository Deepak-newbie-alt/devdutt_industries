/*
  Warnings:

  - You are about to drop the column `pdfUrl` on the `quotationrevisions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "quotationrevisions" DROP COLUMN "pdfUrl";

-- CreateTable
CREATE TABLE "quotationdocuments" (
    "id" SERIAL NOT NULL,
    "quotationRevisionId" INTEGER NOT NULL,
    "fileName" VARCHAR(100) NOT NULL,
    "content" BYTEA NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotationdocuments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotationdocuments_quotationRevisionId_key" ON "quotationdocuments"("quotationRevisionId");

-- AddForeignKey
ALTER TABLE "quotationdocuments" ADD CONSTRAINT "quotationdocuments_quotationRevisionId_fkey" FOREIGN KEY ("quotationRevisionId") REFERENCES "quotationrevisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

