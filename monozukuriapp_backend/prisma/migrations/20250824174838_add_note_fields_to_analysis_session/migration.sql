-- AlterTable
ALTER TABLE "analysis_sessions" ADD COLUMN     "note" TEXT,
ADD COLUMN     "noteUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "noteUpdatedBy" INTEGER;
