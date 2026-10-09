-- CreateEnum
CREATE TYPE "QuotationRevisionStatus" AS ENUM ('DRAFT', 'SENT', 'REVISION_REQUESTED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "quotationrevisions" (
    "id" SERIAL NOT NULL,
    "quotationId" INTEGER NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "quotationRevisionStatus" "QuotationRevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "buyerName" VARCHAR(50) NOT NULL,
    "companyName" VARCHAR(50),
    "address" TEXT NOT NULL,
    "gstNumber" VARCHAR(50) NOT NULL,
    "mobileNumber" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255),
    "productName" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "machineSpecifications" JSONB NOT NULL DEFAULT '{}',
    "terms" JSONB NOT NULL DEFAULT '{}',
    "validUntil" TIMESTAMP(3) NOT NULL,
    "pdfUrl" TEXT,
    "salespersonId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotationrevisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotationitems" (
    "id" SERIAL NOT NULL,
    "quotationRevisionId" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" "Unit" NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quotationitems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotationrevisions_quotationId_revisionNumber_key" ON "quotationrevisions"("quotationId", "revisionNumber");

-- CreateIndex
CREATE INDEX "quotationitems_quotationRevisionId_idx" ON "quotationitems"("quotationRevisionId");

-- AddForeignKey
ALTER TABLE "quotationrevisions" ADD CONSTRAINT "quotationrevisions_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotationrevisions" ADD CONSTRAINT "quotationrevisions_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotationitems" ADD CONSTRAINT "quotationitems_quotationRevisionId_fkey" FOREIGN KEY ("quotationRevisionId") REFERENCES "quotationrevisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
