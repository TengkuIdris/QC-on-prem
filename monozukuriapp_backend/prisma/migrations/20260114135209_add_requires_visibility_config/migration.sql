-- AlterTable
ALTER TABLE "analysis_sessions" ADD COLUMN IF NOT EXISTS "requires_visibility_config" BOOLEAN NOT NULL DEFAULT false;

