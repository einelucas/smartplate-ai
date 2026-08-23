-- CreateEnum
CREATE TYPE "PremiumGrantSource" AS ENUM ('BETA_CODE', 'PROMO_CODE', 'ADMIN');

-- CreateTable
CREATE TABLE "PremiumGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "PremiumGrantSource" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "sourceRefId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PremiumGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetaCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codeHint" TEXT,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "redeemUntil" TIMESTAMP(3),
    "redeemedByUserId" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BetaCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PremiumGrant_sourceRefId_key" ON "PremiumGrant"("sourceRefId");

-- CreateIndex
CREATE INDEX "PremiumGrant_userId_expiresAt_idx" ON "PremiumGrant"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "BetaCode_codeHash_key" ON "BetaCode"("codeHash");

-- CreateIndex
CREATE UNIQUE INDEX "BetaCode_redeemedByUserId_key" ON "BetaCode"("redeemedByUserId");

-- CreateIndex
CREATE INDEX "BetaCode_isActive_idx" ON "BetaCode"("isActive");

-- AddForeignKey
ALTER TABLE "PremiumGrant" ADD CONSTRAINT "PremiumGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
