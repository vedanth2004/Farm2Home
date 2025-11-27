-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "district" TEXT;

-- AlterTable
ALTER TABLE "FarmerProfile" ADD COLUMN     "crId" TEXT,
ADD COLUMN     "distanceToCR" DECIMAL(10,2);

-- CreateIndex
CREATE INDEX "FarmerProfile_crId_idx" ON "FarmerProfile"("crId");
