-- Step 1: Delete all existing seal data (cannot be migrated to new schema)
DELETE FROM "ReceiptSeal";

-- Step 2: Drop columns that will be removed (must drop before enum)
ALTER TABLE "ReceiptSeal" DROP COLUMN "name";
ALTER TABLE "ReceiptSeal" DROP COLUMN "category";
ALTER TABLE "ReceiptSeal" DROP COLUMN "createdBy";
ALTER TABLE "ReceiptSeal" DROP COLUMN "updatedBy";

-- Step 3: Drop the old enum
DROP TYPE "ReceiptSealCategory";

-- Step 4: Add new columns
ALTER TABLE "ReceiptSeal" ADD COLUMN "userId" TEXT NOT NULL;
ALTER TABLE "ReceiptSeal" ADD COLUMN "nickname" TEXT NOT NULL;

-- Step 5: Add unique constraint on userId
ALTER TABLE "ReceiptSeal" ADD CONSTRAINT "ReceiptSeal_userId_key" UNIQUE ("userId");

-- Step 6: Add foreign key constraint
ALTER TABLE "ReceiptSeal" ADD CONSTRAINT "ReceiptSeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
