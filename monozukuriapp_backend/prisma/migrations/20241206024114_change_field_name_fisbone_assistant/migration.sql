/*
  Warnings:

  - You are about to drop the column `parameters` on the `FishBoneAssistant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FishBoneAssistant" DROP COLUMN "parameters",
ADD COLUMN     "diagrams" JSONB NOT NULL DEFAULT '{}';
