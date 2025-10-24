-- Add contactPerson column to RecipientUnit for tracking contact person name
ALTER TABLE "RecipientUnit"
ADD COLUMN "contactPerson" TEXT;
