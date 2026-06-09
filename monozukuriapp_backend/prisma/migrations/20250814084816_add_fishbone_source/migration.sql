-- CreateEnum
CREATE TYPE "FishBoneSource" AS ENUM ('MANUAL', 'AI_GENERATED');

-- AlterTable
ALTER TABLE "FishBone" ADD COLUMN     "aiAssistantId" INTEGER,
ADD COLUMN     "source" "FishBoneSource" NOT NULL DEFAULT 'MANUAL';

-- AddForeignKey
ALTER TABLE "FishBone" ADD CONSTRAINT "FishBone_aiAssistantId_fkey" FOREIGN KEY ("aiAssistantId") REFERENCES "FishBoneAssistant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
