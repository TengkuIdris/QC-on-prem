-- AlterTable
ALTER TABLE "FishBoneAssistant" ADD COLUMN IF NOT EXISTS "language" TEXT DEFAULT 'en';
 
-- AlterTable
ALTER TABLE "Plan" ALTER COLUMN "type" DROP NOT NULL;
 
-- CreateTable
CREATE TABLE IF NOT EXISTS "RecentFiles" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "fishBoneId" INTEGER,
    "ftaId" INTEGER,
    "parentoId" INTEGER,
    "recentlyAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
 
    CONSTRAINT "RecentFiles_pkey" PRIMARY KEY ("id")
);
 
-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RecentFiles_userId_fishBoneId_ftaId_parentoId_key" ON "RecentFiles"("userId", "fishBoneId", "ftaId", "parentoId");
 
-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "RecentFiles" ADD CONSTRAINT "RecentFiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
 
-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "RecentFiles" ADD CONSTRAINT "RecentFiles_fishBoneId_fkey" FOREIGN KEY ("fishBoneId") REFERENCES "FishBone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
 
-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "RecentFiles" ADD CONSTRAINT "RecentFiles_ftaId_fkey" FOREIGN KEY ("ftaId") REFERENCES "FTA"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
 
-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "RecentFiles" ADD CONSTRAINT "RecentFiles_parentoId_fkey" FOREIGN KEY ("parentoId") REFERENCES "Parento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
