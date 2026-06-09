-- CreateEnum
CREATE TYPE "PublicScopeEnum" AS ENUM ('private', 'company', 'group');

-- Update existing data: ensure all values are valid enum values
-- Set any invalid values to 'private' (default)
UPDATE "analysis_sessions" 
SET "public_scope" = 'private' 
WHERE "public_scope" IS NOT NULL 
  AND "public_scope" NOT IN ('private', 'company', 'group');

-- Drop index that uses the old column (if exists)
DROP INDEX IF EXISTS "analysis_sessions_public_scope_status_idx";

-- AlterTable: Convert column from VARCHAR to ENUM
-- PostgreSQL requires a multi-step process for this conversion

-- Step 1: Add a new column with enum type
ALTER TABLE "analysis_sessions" 
ADD COLUMN "public_scope_new" "PublicScopeEnum" DEFAULT 'private';

-- Step 2: Copy data from old column to new column
UPDATE "analysis_sessions" 
SET "public_scope_new" = CASE 
  WHEN "public_scope" = 'private' THEN 'private'::"PublicScopeEnum"
  WHEN "public_scope" = 'company' THEN 'company'::"PublicScopeEnum"
  WHEN "public_scope" = 'group' THEN 'group'::"PublicScopeEnum"
  ELSE 'private'::"PublicScopeEnum"
END
WHERE "public_scope" IS NOT NULL;

-- Step 3: Drop the old column
ALTER TABLE "analysis_sessions" DROP COLUMN "public_scope";

-- Step 4: Rename the new column to the original name
ALTER TABLE "analysis_sessions" RENAME COLUMN "public_scope_new" TO "public_scope";

-- Step 5: Set default value
ALTER TABLE "analysis_sessions" ALTER COLUMN "public_scope" SET DEFAULT 'private';

-- Step 6: Recreate index
CREATE INDEX IF NOT EXISTS "analysis_sessions_public_scope_status_idx" ON "analysis_sessions"("public_scope", "status");

