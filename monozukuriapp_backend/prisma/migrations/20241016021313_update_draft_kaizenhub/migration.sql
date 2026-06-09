-- AlterTable
ALTER TABLE "Improvement" ADD COLUMN     "isDraft" BOOLEAN,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "type" DROP NOT NULL,
ALTER COLUMN "situationBeforeImprovement" DROP NOT NULL,
ALTER COLUMN "situationAfterImprovement" DROP NOT NULL,
ALTER COLUMN "improvementProcedures" DROP NOT NULL,
ALTER COLUMN "tipsAndTricks" DROP NOT NULL,
ALTER COLUMN "afterImage" DROP NOT NULL,
ALTER COLUMN "beforeImage" DROP NOT NULL;
