/*
  Warnings:
 
  - You are about to drop the column `language` on the `FishBoneAssistant` table. All the data in the column will be lost.
 
*/
-- AlterTable
ALTER TABLE "FishBoneAssistant" DROP COLUMN IF EXISTS "language";
 
-- CreateTable
CREATE TABLE IF NOT EXISTS "EmailTemplate" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 
    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);
 
-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EmailTemplate_type_key" ON "EmailTemplate"("type");
