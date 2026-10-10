-- CreateTable
CREATE TABLE "CreditCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "limitCents" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RecurringRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "category" TEXT,
    "vaultId" TEXT,
    "cardId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecurringRule_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RecurringRule_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "CreditCard" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RecurringRule" ("active", "amountCents", "category", "createdAt", "description", "endDate", "frequency", "id", "startDate", "type") SELECT "active", "amountCents", "category", "createdAt", "description", "endDate", "frequency", "id", "startDate", "type" FROM "RecurringRule";
DROP TABLE "RecurringRule";
ALTER TABLE "new_RecurringRule" RENAME TO "RecurringRule";
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'ENTRY',
    "amountCents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "vaultId" TEXT,
    "cardId" TEXT,
    "recurringRuleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "CreditCard" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_recurringRuleId_fkey" FOREIGN KEY ("recurringRuleId") REFERENCES "RecurringRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amountCents", "category", "createdAt", "date", "description", "id", "recurringRuleId", "type") SELECT "amountCents", "category", "createdAt", "date", "description", "id", "recurringRuleId", "type" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");
CREATE INDEX "Transaction_vaultId_idx" ON "Transaction"("vaultId");
CREATE INDEX "Transaction_cardId_idx" ON "Transaction"("cardId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
