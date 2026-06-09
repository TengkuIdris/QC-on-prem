/*
  Warnings:

  - You are about to drop the column `fishBoneId` on the `FishBoneAssistant` table. All the data in the column will be lost.
  - You are about to drop the column `senderType` on the `FishBoneAssistant` table. All the data in the column will be lost.
  - Added the required column `month` to the `FishBoneAssistant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numberNode` to the `FishBoneAssistant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `FishBoneAssistant` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('GOOD', 'BAD');

-- DropForeignKey
ALTER TABLE "FishBoneAssistant" DROP CONSTRAINT "FishBoneAssistant_fishBoneId_fkey";

-- AlterTable
ALTER TABLE "FishBoneAssistant" DROP COLUMN "fishBoneId",
DROP COLUMN "senderType",
ADD COLUMN     "month" INTEGER NOT NULL,
ADD COLUMN     "numberNode" INTEGER NOT NULL,
ADD COLUMN     "response" JSONB,
ADD COLUMN     "year" INTEGER NOT NULL;

-- DropEnum
DROP TYPE "SenderType";

-- CreateTable
CREATE TABLE "FishBoneAssistantReview" (
    "id" SERIAL NOT NULL,
    "fishBoneAssistantId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "review" "ReviewType" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FishBoneAssistantReview_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FishBoneAssistantReview" ADD CONSTRAINT "FishBoneAssistantReview_fishBoneAssistantId_fkey" FOREIGN KEY ("fishBoneAssistantId") REFERENCES "FishBoneAssistant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FishBoneAssistantReview" ADD CONSTRAINT "FishBoneAssistantReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
