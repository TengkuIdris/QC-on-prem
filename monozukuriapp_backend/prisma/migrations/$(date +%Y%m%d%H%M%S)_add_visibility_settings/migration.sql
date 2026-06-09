-- AlterTable
ALTER TABLE "analysis_sessions" ADD COLUMN IF NOT EXISTS "public_scope" VARCHAR(50) DEFAULT 'private',
ADD COLUMN IF NOT EXISTS "hide_author_name" BOOLEAN DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "analysis_sessions_public_scope_status_idx" ON "analysis_sessions"("public_scope", "status");

