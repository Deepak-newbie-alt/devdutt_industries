-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CONFIRMED', 'IN_PRODUCTION', 'READY', 'DISPATCHED', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "orderNumber" VARCHAR(50) NOT NULL,
    "quotationRevisionId" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orderitems" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" "Unit" NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "orderitems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "orders_quotationRevisionId_key" ON "orders"("quotationRevisionId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_quotationRevisionId_fkey" FOREIGN KEY ("quotationRevisionId") REFERENCES "quotationrevisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderitems" ADD CONSTRAINT "orderitems_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
