-- CreateTable
CREATE TABLE "TradeTemplate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "size" DOUBLE PRECISION NOT NULL,
    "leverage" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TradeTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "symbol" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "size" DOUBLE PRECISION NOT NULL,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "hyperliquidOrderId" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "TradeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradeTemplate_name_key" ON "TradeTemplate"("name");
