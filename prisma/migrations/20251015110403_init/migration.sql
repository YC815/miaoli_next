-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'STAFF', 'VOLUNTEER');

-- CreateEnum
CREATE TYPE "public"."ChangeType" AS ENUM ('INCREASE', 'DECREASE');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nickname" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'VOLUNTEER',
    "isFirstLogin" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Supply" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "safetyStock" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT '個',

    CONSTRAINT "Supply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Donor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "taxId" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DonationRecord" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "DonationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DonationItem" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "expiryDate" TIMESTAMP(3),
    "isStandard" BOOLEAN NOT NULL DEFAULT false,
    "itemCategory" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemUnit" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "DonationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Disbursement" (
    "id" TEXT NOT NULL,
    "recipientUnit" TEXT NOT NULL,
    "recipientPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Disbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DisbursementItem" (
    "id" TEXT NOT NULL,
    "disbursementId" TEXT NOT NULL,
    "itemCategory" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemUnit" TEXT NOT NULL,

    CONSTRAINT "DisbursementItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryLog" (
    "id" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "changeType" "public"."ChangeType" NOT NULL,
    "changeAmount" INTEGER NOT NULL,
    "newQuantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "InventoryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecipientUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipientUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryChangeReason" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "changeType" "public"."ChangeType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryChangeReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SerialNumberCounter" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "prefix" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SerialNumberCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StandardItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "units" JSONB NOT NULL,
    "defaultUnit" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StandardItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CustomItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "units" JSONB NOT NULL,
    "defaultUnit" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "CustomItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ItemStock" (
    "id" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemCategory" TEXT NOT NULL,
    "itemUnit" TEXT NOT NULL,
    "totalStock" INTEGER NOT NULL,
    "safetyStock" INTEGER NOT NULL DEFAULT 0,
    "isStandard" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ItemCondition" (
    "id" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "donationItemId" TEXT,
    "disbursementItemId" TEXT,

    CONSTRAINT "ItemCondition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "public"."User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Supply_name_category_key" ON "public"."Supply"("name", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Donor_name_key" ON "public"."Donor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DonationRecord_serialNumber_key" ON "public"."DonationRecord"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Disbursement_serialNumber_key" ON "public"."Disbursement"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "public"."Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RecipientUnit_name_key" ON "public"."RecipientUnit"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_name_key" ON "public"."Unit"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SerialNumberCounter_type_key" ON "public"."SerialNumberCounter"("type");

-- CreateIndex
CREATE UNIQUE INDEX "StandardItem_name_category_key" ON "public"."StandardItem"("name", "category");

-- CreateIndex
CREATE UNIQUE INDEX "CustomItem_name_category_key" ON "public"."CustomItem"("name", "category");

-- CreateIndex
CREATE UNIQUE INDEX "ItemStock_itemName_itemCategory_key" ON "public"."ItemStock"("itemName", "itemCategory");

-- AddForeignKey
ALTER TABLE "public"."DonationRecord" ADD CONSTRAINT "DonationRecord_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "public"."Donor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DonationRecord" ADD CONSTRAINT "DonationRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DonationItem" ADD CONSTRAINT "DonationItem_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "public"."DonationRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Disbursement" ADD CONSTRAINT "Disbursement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DisbursementItem" ADD CONSTRAINT "DisbursementItem_disbursementId_fkey" FOREIGN KEY ("disbursementId") REFERENCES "public"."Disbursement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryLog" ADD CONSTRAINT "InventoryLog_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "public"."Supply"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryLog" ADD CONSTRAINT "InventoryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomItem" ADD CONSTRAINT "CustomItem_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemCondition" ADD CONSTRAINT "ItemCondition_disbursementItemId_fkey" FOREIGN KEY ("disbursementItemId") REFERENCES "public"."DisbursementItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemCondition" ADD CONSTRAINT "ItemCondition_donationItemId_fkey" FOREIGN KEY ("donationItemId") REFERENCES "public"."DonationItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
