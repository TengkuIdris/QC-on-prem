/*
  Warnings:

  - You are about to drop the `Keyword` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReviewKeyword` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ReviewKeyword" DROP CONSTRAINT "ReviewKeyword_keywordId_fkey";

-- DropForeignKey
ALTER TABLE "ReviewKeyword" DROP CONSTRAINT "ReviewKeyword_reviewId_fkey";

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "keyword" VARCHAR(2550),
ALTER COLUMN "rate" DROP NOT NULL,
ALTER COLUMN "rate" DROP DEFAULT,
ALTER COLUMN "comment" DROP NOT NULL,
ALTER COLUMN "impactPercent" DROP NOT NULL,
ALTER COLUMN "attraction" DROP NOT NULL,
ALTER COLUMN "howUse" DROP NOT NULL;

-- DropTable
DROP TABLE "Keyword";

-- DropTable
DROP TABLE "ReviewKeyword";
