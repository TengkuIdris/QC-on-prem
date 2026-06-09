-- Create first_answer column on analysis_sessions if it does not exist
ALTER TABLE "analysis_sessions"
ADD COLUMN IF NOT EXISTS "first_answer" VARCHAR(2000) NULL;

-- Optional: Backfill from JSON analysis_data.first_answer if present and column is null
-- UPDATE "analysis_sessions"
-- SET "first_answer" = (analysis_data->>'first_answer')
-- WHERE (analysis_data ? 'first_answer') AND "first_answer" IS NULL;


