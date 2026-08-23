-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingVersion" INTEGER NOT NULL DEFAULT 0;

-- DataMigration: "height" era armazenada em metros (ex.: 1.75); passa a ser
-- centímetros (ex.: 175) em todo o projeto. Converte apenas valores no range
-- plausível de metros (<= 3) para não converter em dobro se a migration for
-- reaplicada ou algum valor já estiver em cm.
UPDATE "Profile" SET "height" = "height" * 100 WHERE "height" IS NOT NULL AND "height" <= 3;
