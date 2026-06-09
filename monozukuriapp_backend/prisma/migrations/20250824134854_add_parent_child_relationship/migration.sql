-- AlterTable
ALTER TABLE "analysis_sessions" ADD COLUMN     "childrenCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "analysis_sessions_parentId_idx" ON "analysis_sessions"("parentId");

-- AddForeignKey
ALTER TABLE "analysis_sessions" ADD CONSTRAINT "analysis_sessions_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "analysis_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
