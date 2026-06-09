-- CreateEnum
CREATE TYPE "IndustryEnum" AS ENUM ('MANUFACTURING', 'SERVICES', 'RETAIL', 'OTHER');

-- CreateEnum
CREATE TYPE "TypeImprovementEnum" AS ENUM ('FIVES', 'KANBAN', 'IMPROVE', 'TPM', 'LEAN_MANUFACTURING_SYSTEM');

-- CreateEnum
CREATE TYPE "Orientation" AS ENUM ('portrait', 'vertical');

-- CreateEnum
CREATE TYPE "ParetoMode" AS ENUM ('SINGLE', 'AFTER', 'BEFORE', 'COMPARE');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "industry" "IndustryEnum",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSetting" (
    "id" SERIAL NOT NULL,
    "fontFamily" VARCHAR(255) NOT NULL DEFAULT 'JTC',
    "language" VARCHAR(255) NOT NULL DEFAULT 'JP',
    "autoSave" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Improvement" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" VARCHAR(2550) NOT NULL,
    "type" "TypeImprovementEnum" NOT NULL,
    "situationBeforeImprovement" VARCHAR(2550) NOT NULL,
    "situationAfterImprovement" VARCHAR(2550) NOT NULL,
    "improvementProcedures" VARCHAR(2550) NOT NULL,
    "tipsAndTricks" VARCHAR(2550) NOT NULL,
    "afterImage" VARCHAR(255) NOT NULL,
    "beforeImage" VARCHAR(255) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Improvement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Label" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabelAndImprovement" (
    "labelId" INTEGER NOT NULL,
    "improvementId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabelAndImprovement_pkey" PRIMARY KEY ("labelId","improvementId")
);

-- CreateTable
CREATE TABLE "Parento" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "afterId" INTEGER,
    "beforeId" INTEGER,
    "singleId" INTEGER,
    "userId" INTEGER NOT NULL,
    "mode" "ParetoMode" NOT NULL DEFAULT 'SINGLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParetoRecord" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "yAxisLabel" VARCHAR(255) NOT NULL,
    "yAxisUnits" VARCHAR(255) NOT NULL,
    "otherColor" VARCHAR(255) NOT NULL,
    "lineChartColor" VARCHAR(255) NOT NULL,
    "labelOrientation" "Orientation" NOT NULL DEFAULT 'portrait',
    "yAxisLabelOrientation" "Orientation" NOT NULL DEFAULT 'portrait',
    "lineLabelOrientation" "Orientation" NOT NULL DEFAULT 'portrait',
    "columnLabelOrientation" "Orientation" NOT NULL DEFAULT 'portrait',
    "xAxisItemCount" INTEGER NOT NULL,
    "lineThickness" INTEGER NOT NULL,
    "xAxisFontSize" INTEGER NOT NULL,
    "yAxisFontSize" INTEGER NOT NULL,
    "lineLabelFontSize" INTEGER NOT NULL,
    "columnLabelFontSize" INTEGER NOT NULL,
    "axisFontSize" INTEGER NOT NULL,
    "fontFamily" VARCHAR(255) NOT NULL,
    "showBarLabels" BOOLEAN NOT NULL DEFAULT false,
    "showLineLabels" BOOLEAN NOT NULL DEFAULT false,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "createdTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParetoRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParetoItem" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "cumulativeQuantity" INTEGER NOT NULL,
    "cumulativePercentage" DECIMAL(65,30) NOT NULL,
    "color" VARCHAR(255) NOT NULL,
    "showLineLabel" BOOLEAN NOT NULL,
    "showBarLabel" BOOLEAN NOT NULL,
    "paretoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParetoItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSetting_userId_key" ON "UserSetting"("userId");

-- CreateIndex
CREATE INDEX "Improvement_createdAt_idx" ON "Improvement"("createdAt");

-- CreateIndex
CREATE INDEX "Improvement_title_createdAt_idx" ON "Improvement"("title", "createdAt");

-- CreateIndex
CREATE INDEX "LabelAndImprovement_improvementId_idx" ON "LabelAndImprovement"("improvementId");

-- CreateIndex
CREATE INDEX "LabelAndImprovement_labelId_idx" ON "LabelAndImprovement"("labelId");

-- CreateIndex
CREATE UNIQUE INDEX "Parento_afterId_key" ON "Parento"("afterId");

-- CreateIndex
CREATE UNIQUE INDEX "Parento_beforeId_key" ON "Parento"("beforeId");

-- CreateIndex
CREATE UNIQUE INDEX "Parento_singleId_key" ON "Parento"("singleId");

-- AddForeignKey
ALTER TABLE "UserSetting" ADD CONSTRAINT "UserSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Improvement" ADD CONSTRAINT "Improvement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelAndImprovement" ADD CONSTRAINT "LabelAndImprovement_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelAndImprovement" ADD CONSTRAINT "LabelAndImprovement_improvementId_fkey" FOREIGN KEY ("improvementId") REFERENCES "Improvement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parento" ADD CONSTRAINT "Parento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parento" ADD CONSTRAINT "Parento_afterId_fkey" FOREIGN KEY ("afterId") REFERENCES "ParetoRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parento" ADD CONSTRAINT "Parento_beforeId_fkey" FOREIGN KEY ("beforeId") REFERENCES "ParetoRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parento" ADD CONSTRAINT "Parento_singleId_fkey" FOREIGN KEY ("singleId") REFERENCES "ParetoRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParetoItem" ADD CONSTRAINT "ParetoItem_paretoId_fkey" FOREIGN KEY ("paretoId") REFERENCES "ParetoRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
