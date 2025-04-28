-- CreateTable
CREATE TABLE "TradeTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "size" REAL NOT NULL,
    "leverage" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "TradeLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "symbol" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "size" REAL NOT NULL,
    "entryPrice" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "hyperliquidOrderId" TEXT,
    "errorMessage" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "TradeTemplate_name_key" ON "TradeTemplate"("name");
