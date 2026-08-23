-- AlterEnum
ALTER TYPE "PostType" ADD VALUE 'ACTIVITY';

-- AlterTable
ALTER TABLE "CommunityPost" ADD COLUMN     "activityLogId" TEXT;

-- AlterTable
ALTER TABLE "DailyActivity" ADD COLUMN     "activityXpEarned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mealCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "physicalActivityCompleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "customActivityName" TEXT,
    "durationMin" INTEGER NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "intensity" TEXT,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_userId_performedAt_idx" ON "ActivityLog"("userId", "performedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityLog_source_externalId_key" ON "ActivityLog"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPost_activityLogId_key" ON "CommunityPost"("activityLogId");

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_activityLogId_fkey" FOREIGN KEY ("activityLogId") REFERENCES "ActivityLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

