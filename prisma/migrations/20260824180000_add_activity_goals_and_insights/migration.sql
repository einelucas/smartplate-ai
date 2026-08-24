-- CreateEnum
CREATE TYPE "ActivityGoalMetric" AS ENUM ('ACTIVE_DAYS', 'ACTIVITY_MINUTES', 'ACTIVITY_COUNT');

-- CreateTable
CREATE TABLE "ActivityGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metric" "ActivityGoalMetric" NOT NULL,
    "target" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "content" JSONB NOT NULL,
    "dataHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityGoal_userId_isActive_idx" ON "ActivityGoal"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityGoal_userId_metric_key" ON "ActivityGoal"("userId", "metric");

-- CreateIndex
CREATE INDEX "ActivityInsight_userId_periodStart_idx" ON "ActivityInsight"("userId", "periodStart");

-- AddForeignKey
ALTER TABLE "ActivityGoal" ADD CONSTRAINT "ActivityGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityInsight" ADD CONSTRAINT "ActivityInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

