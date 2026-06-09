-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "FishBoneAssistant" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "fishBoneId" INTEGER,
    "parameters" JSONB NOT NULL,
    "problem" TEXT,
    "senderType" "SenderType" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FishBoneAssistant_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FishBoneAssistant" ADD CONSTRAINT "FishBoneAssistant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FishBoneAssistant" ADD CONSTRAINT "FishBoneAssistant_fishBoneId_fkey" FOREIGN KEY ("fishBoneId") REFERENCES "FishBone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
