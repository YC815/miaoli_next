-- CreateEnum
CREATE TYPE "public"."ReceiptSealCategory" AS ENUM ('ORG', 'CHAIRMAN', 'HANDLER');

-- CreateTable
CREATE TABLE "public"."ReceiptSeal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "public"."ReceiptSealCategory" NOT NULL,
    "imageData" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/png',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "ReceiptSeal_pkey" PRIMARY KEY ("id")
);
