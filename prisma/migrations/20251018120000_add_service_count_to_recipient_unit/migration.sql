-- Add serviceCount column to RecipientUnit for tracking service population size
ALTER TABLE "RecipientUnit"
ADD COLUMN "serviceCount" INTEGER;
