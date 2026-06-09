-- AlterTable
ALTER TABLE "FishBoneAssistant" ADD COLUMN     "fishBoneId" INTEGER;

-- AddForeignKey
ALTER TABLE "FishBoneAssistant" ADD CONSTRAINT "FishBoneAssistant_fishBoneId_fkey" FOREIGN KEY ("fishBoneId") REFERENCES "FishBone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
