-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "maxPointDifferentialAdvantage" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "maxPointDifferentialDisadvantage" INTEGER NOT NULL DEFAULT 20;
