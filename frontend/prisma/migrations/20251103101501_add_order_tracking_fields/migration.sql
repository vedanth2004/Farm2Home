-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "crId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "adminProfit" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "PickupJob" ADD COLUMN     "agentFee" DECIMAL(10,2),
ADD COLUMN     "deliveryDistance" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "AdminRevenue" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminRevenue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminRevenue_orderId_idx" ON "AdminRevenue"("orderId");

-- CreateIndex
CREATE INDEX "AdminRevenue_orderItemId_idx" ON "AdminRevenue"("orderItemId");

-- CreateIndex
CREATE INDEX "AdminRevenue_createdAt_idx" ON "AdminRevenue"("createdAt");

-- CreateIndex
CREATE INDEX "Order_crId_idx" ON "Order"("crId");

-- AddForeignKey
ALTER TABLE "AdminRevenue" ADD CONSTRAINT "AdminRevenue_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
