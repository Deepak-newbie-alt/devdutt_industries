-- CreateEnum
CREATE TYPE "OrderActivityType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'NOTE_ADDED');

-- CreateTable
CREATE TABLE "orderactivities" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "userId" INTEGER,
    "activityType" "OrderActivityType" NOT NULL,
    "previousStatus" "OrderStatus",
    "newStatus" "OrderStatus",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orderactivities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "orderactivities_orderId_createdAt_idx" ON "orderactivities"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "orderactivities" ADD CONSTRAINT "orderactivities_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderactivities" ADD CONSTRAINT "orderactivities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
