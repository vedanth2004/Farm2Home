-- CreateTable
CREATE TABLE "CustomerPrediction" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "predictedCategory" TEXT,
    "predictionProbability" DOUBLE PRECISION,
    "predictedProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPrediction_customerId_key" ON "CustomerPrediction"("customerId");

-- CreateIndex
CREATE INDEX "CustomerPrediction_customerId_idx" ON "CustomerPrediction"("customerId");

-- CreateIndex
CREATE INDEX "CustomerPrediction_predictedCategory_idx" ON "CustomerPrediction"("predictedCategory");
