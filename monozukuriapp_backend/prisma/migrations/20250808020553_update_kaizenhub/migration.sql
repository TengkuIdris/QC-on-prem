-- CreateEnum
CREATE TYPE "MetricsEnum" AS ENUM ('BEFORE', 'AFTER');

-- AlterTable
ALTER TABLE "Improvement" ADD COLUMN     "categoriesId" INTEGER,
ADD COLUMN     "caution" TEXT,
ADD COLUMN     "company" VARCHAR(255),
ADD COLUMN     "department" VARCHAR(255),
ADD COLUMN     "email" VARCHAR(255),
ADD COLUMN     "execDays" INTEGER,
ADD COLUMN     "fullName" VARCHAR(255),
ADD COLUMN     "prepDays" INTEGER,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "tips" TEXT,
ALTER COLUMN "title" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metrics" (
    "id" SERIAL NOT NULL,
    "improvementId" INTEGER,
    "label" VARCHAR(255) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "type" "MetricsEnum" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelatedDocuments" (
    "id" SERIAL NOT NULL,
    "improvementId" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "url" VARCHAR(255) NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelatedDocuments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImplementationSteps" (
    "id" SERIAL NOT NULL,
    "improvementId" INTEGER,
    "stepNumber" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImplementationSteps_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Improvement" ADD CONSTRAINT "Improvement_categoriesId_fkey" FOREIGN KEY ("categoriesId") REFERENCES "Categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metrics" ADD CONSTRAINT "Metrics_improvementId_fkey" FOREIGN KEY ("improvementId") REFERENCES "Improvement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatedDocuments" ADD CONSTRAINT "RelatedDocuments_improvementId_fkey" FOREIGN KEY ("improvementId") REFERENCES "Improvement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImplementationSteps" ADD CONSTRAINT "ImplementationSteps_improvementId_fkey" FOREIGN KEY ("improvementId") REFERENCES "Improvement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
