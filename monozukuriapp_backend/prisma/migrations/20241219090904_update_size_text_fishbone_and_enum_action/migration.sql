-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActionEnum" ADD VALUE 'PARENTO_DOWNLOAD_IMAGE';
ALTER TYPE "ActionEnum" ADD VALUE 'FISHBONE_DOWNLOAD_IMAGE';
ALTER TYPE "ActionEnum" ADD VALUE 'FISHBONE_CHOOSE_FONT_TEXT';
ALTER TYPE "ActionEnum" ADD VALUE 'FISHBONE_CHOOSE_FONT_SIZE';
ALTER TYPE "ActionEnum" ADD VALUE 'FTA_DOWNLOAD_IMAGE';
ALTER TYPE "ActionEnum" ADD VALUE 'FTA_CHOOSE_FONT_TEXT';
ALTER TYPE "ActionEnum" ADD VALUE 'FTA_CHOOSE_FONT_SIZE';

-- AlterTable
ALTER TABLE "FishBone" ADD COLUMN     "firstLevelFontSize" INTEGER,
ADD COLUMN     "otherLevelFontSize" INTEGER,
ADD COLUMN     "rootFontSize" INTEGER;
