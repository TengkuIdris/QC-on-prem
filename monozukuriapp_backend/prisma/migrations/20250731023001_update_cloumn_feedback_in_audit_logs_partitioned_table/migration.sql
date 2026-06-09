-- AlterTable
ALTER TABLE "FishBoneAssistant" ADD COLUMN     "language" TEXT DEFAULT 'en';

-- AlterTable
ALTER TABLE "audit_logs_partitioned" ADD COLUMN     "feedback" TEXT;
