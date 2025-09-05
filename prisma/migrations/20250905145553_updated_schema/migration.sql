/*
  Warnings:

  - You are about to drop the `Donation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `notes` on the `Disbursement` table. All the data in the column will be lost.
  - You are about to drop the column `recipientName` on the `Disbursement` table. All the data in the column will be lost.
  - Added the required column `recipientUnit` to the `Disbursement` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Donation";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "DonationRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "donorName" TEXT NOT NULL,
    "donorPhone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "DonationRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplyId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "changeAmount" INTEGER NOT NULL,
    "newQuantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "InventoryLog_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Disbursement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipientUnit" TEXT NOT NULL,
    "recipientPhone" TEXT,
    "purpose" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Disbursement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Disbursement" ("createdAt", "id", "recipientPhone", "userId") SELECT "createdAt", "id", "recipientPhone", "userId" FROM "Disbursement";
DROP TABLE "Disbursement";
ALTER TABLE "new_Disbursement" RENAME TO "Disbursement";
CREATE TABLE "new_DonationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "donationId" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "expiryDate" DATETIME,
    CONSTRAINT "DonationItem_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "DonationRecord" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DonationItem_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DonationItem" ("donationId", "id", "quantity", "supplyId") SELECT "donationId", "id", "quantity", "supplyId" FROM "DonationItem";
DROP TABLE "DonationItem";
ALTER TABLE "new_DonationItem" RENAME TO "DonationItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
