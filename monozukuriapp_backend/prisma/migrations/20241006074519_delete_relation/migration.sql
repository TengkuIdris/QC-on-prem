/*
  Warnings:

  - You are about to alter the column `cumulativePercentage` on the `ParetoItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.

*/
-- DropForeignKey
ALTER TABLE "ParetoItem" DROP CONSTRAINT "ParetoItem_paretoId_fkey";

-- AlterTable
ALTER TABLE "ParetoItem" ALTER COLUMN "cumulativePercentage" SET DATA TYPE DOUBLE PRECISION;

-- AddForeignKey
ALTER TABLE "ParetoItem" ADD CONSTRAINT "ParetoItem_paretoId_fkey" FOREIGN KEY ("paretoId") REFERENCES "ParetoRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
