-- CreateEnum
CREATE TYPE "ActivitySource" AS ENUM ('MANUAL', 'STRAVA', 'GARMIN', 'HEALTH_CONNECT', 'APPLE_HEALTH', 'SAMSUNG_HEALTH', 'FITBIT', 'OTHER');

-- CreateEnum
CREATE TYPE "ConnectedAppProvider" AS ENUM ('STRAVA', 'GARMIN', 'HEALTH_CONNECT', 'APPLE_HEALTH', 'SAMSUNG_HEALTH', 'FITBIT', 'OTHER');

-- CreateEnum
CREATE TYPE "ConnectedAppStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ChallengeMetric" ADD VALUE 'ACTIVITY_COUNT';
ALTER TYPE "ChallengeMetric" ADD VALUE 'ACTIVITY_MINUTES';
ALTER TYPE "ChallengeMetric" ADD VALUE 'WALKING_DAYS';
ALTER TYPE "ChallengeMetric" ADD VALUE 'RUNNING_DAYS';
ALTER TYPE "ChallengeMetric" ADD VALUE 'CYCLING_DAYS';
ALTER TYPE "ChallengeMetric" ADD VALUE 'STRENGTH_DAYS';
ALTER TYPE "ChallengeMetric" ADD VALUE 'BALANCED_DAYS';

-- AlterEnum
ALTER TYPE "PostType" ADD VALUE 'EXTERNAL_SHARE';

-- AlterTable: ActivityLog.source String -> ActivitySource enum.
-- Cast (não drop+recreate) para preservar os valores existentes ao pé da
-- letra em vez de depender do DEFAULT — mesmo hoje só existindo linhas
-- "MANUAL", este é o caminho seguro de princípio (nunca perder ActivityLog).
ALTER TABLE "ActivityLog" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "ActivityLog" ALTER COLUMN "source" TYPE "ActivitySource" USING ("source"::"ActivitySource");
ALTER TABLE "ActivityLog" ALTER COLUMN "source" SET DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectedApp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "ConnectedAppProvider" NOT NULL,
    "status" "ConnectedAppStatus" NOT NULL DEFAULT 'CONNECTED',
    "scopes" TEXT[],
    "providerUserId" TEXT,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "expiresAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalActivityCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "ConnectedAppProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "name" TEXT,
    "durationMin" INTEGER NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalActivityCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "ConnectedApp_userId_idx" ON "ConnectedApp"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedApp_userId_provider_key" ON "ConnectedApp"("userId", "provider");

-- CreateIndex
CREATE INDEX "ExternalActivityCache_userId_provider_idx" ON "ExternalActivityCache"("userId", "provider");

-- CreateIndex
CREATE INDEX "ExternalActivityCache_expiresAt_idx" ON "ExternalActivityCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalActivityCache_userId_provider_externalId_key" ON "ExternalActivityCache"("userId", "provider", "externalId");

-- NOTA: o índice único ActivityLog_source_externalId_key já existe (criado
-- na migration original de ActivityLog) e continua válido após o ALTER
-- COLUMN TYPE acima — não recriar aqui.

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectedApp" ADD CONSTRAINT "ConnectedApp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalActivityCache" ADD CONSTRAINT "ExternalActivityCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
