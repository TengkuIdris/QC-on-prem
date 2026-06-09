/*
  Warnings:

  - You are about to drop the column `industry` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `UserSetting` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserSetting" DROP CONSTRAINT "UserSetting_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "industry",
ADD COLUMN     "isConfirmed" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "UserSetting";
