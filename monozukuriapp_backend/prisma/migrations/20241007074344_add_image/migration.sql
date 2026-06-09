/*
  Warnings:

  - Added the required column `image` to the `ParetoRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ParetoRecord" ADD COLUMN     "image" VARCHAR(255) NOT NULL,
ALTER COLUMN "lineThickness" SET DATA TYPE DOUBLE PRECISION;
