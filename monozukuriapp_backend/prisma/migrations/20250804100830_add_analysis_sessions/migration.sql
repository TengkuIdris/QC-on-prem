-- CreateTable
CREATE TABLE "analysis_sessions" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "participants" INTEGER[],
    "status" VARCHAR(50) NOT NULL DEFAULT 'in_progress',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "analysisData" JSONB DEFAULT '{}',

    CONSTRAINT "analysis_sessions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "analysis_sessions" ADD CONSTRAINT "analysis_sessions_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
