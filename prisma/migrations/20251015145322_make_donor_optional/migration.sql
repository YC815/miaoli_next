-- DropForeignKey
ALTER TABLE "public"."DonationRecord" DROP CONSTRAINT "DonationRecord_donorId_fkey";

-- AlterTable
ALTER TABLE "public"."DonationRecord" ALTER COLUMN "donorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."DonationRecord" ADD CONSTRAINT "DonationRecord_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "public"."Donor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
