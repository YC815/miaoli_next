/*
  Warnings:

  - You are about to drop the column `recipientUnit` on the `Disbursement` table. All the data in the column will be lost.
  - Added the required column `recipientUnitName` to the `Disbursement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Disbursement" DROP COLUMN "recipientUnit",
ADD COLUMN     "recipientAddress" TEXT,
ADD COLUMN     "recipientUnitId" TEXT,
ADD COLUMN     "recipientUnitName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."DisbursementItem" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "public"."Disbursement" ADD CONSTRAINT "Disbursement_recipientUnitId_fkey" FOREIGN KEY ("recipientUnitId") REFERENCES "public"."RecipientUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
