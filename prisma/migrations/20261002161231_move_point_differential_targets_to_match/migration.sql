-- AlterTable
ALTER TABLE "AppSettings" DROP COLUMN "maxPointDifferentialAdvantage",
DROP COLUMN "maxPointDifferentialDisadvantage";

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "maxPointDifferentialAdvantage" INTEGER,
ADD COLUMN     "maxPointDifferentialDisadvantage" INTEGER;
