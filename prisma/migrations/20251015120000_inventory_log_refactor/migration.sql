-- Refactor inventory logs to align with ItemStock based schema
ALTER TABLE "public"."InventoryLog"
  DROP CONSTRAINT IF EXISTS "InventoryLog_supplyId_fkey";

ALTER TABLE "public"."InventoryLog"
  RENAME COLUMN "supplyId" TO "itemStockId";

ALTER TABLE "public"."InventoryLog"
  ADD COLUMN     "previousQuantity" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "public"."InventoryLog"
  ADD CONSTRAINT "InventoryLog_itemStockId_fkey"
  FOREIGN KEY ("itemStockId") REFERENCES "public"."ItemStock"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop default after backfilling existing rows
ALTER TABLE "public"."InventoryLog"
  ALTER COLUMN "previousQuantity" DROP DEFAULT;
