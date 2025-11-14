-- Drop unique constraint to allow multiple QR tools per admin
-- This enables the multi-tool architecture where each admin can have
-- multiple QR campaigns with independent settings

-- Drop the unique constraint (if it exists)
ALTER TABLE "Tool" DROP CONSTRAINT IF EXISTS "Tool_adminId_toolType_key";

-- Drop the index (if it exists separately)
DROP INDEX IF EXISTS "Tool_adminId_toolType_key";
