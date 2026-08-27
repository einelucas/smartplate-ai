-- Onda 2 do backlog de features: mutes de feed (silenciar tipo de conteúdo /
-- ocultar usuário sem bloquear), convite de grupo direcionado, e meta
-- coletiva editorial em desafios de grupo. Tudo aditivo.

-- CreateTable
CREATE TABLE "UserContentMute" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserContentMute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserContentMute_userId_postType_key" ON "UserContentMute"("userId", "postType");

-- CreateIndex
CREATE INDEX "UserContentMute_userId_idx" ON "UserContentMute"("userId");

-- CreateTable
CREATE TABLE "UserFeedMute" (
    "id" TEXT NOT NULL,
    "muterUserId" TEXT NOT NULL,
    "mutedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFeedMute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserFeedMute_muterUserId_mutedUserId_key" ON "UserFeedMute"("muterUserId", "mutedUserId");

-- CreateIndex
CREATE INDEX "UserFeedMute_muterUserId_idx" ON "UserFeedMute"("muterUserId");

-- CreateIndex
CREATE INDEX "UserFeedMute_mutedUserId_idx" ON "UserFeedMute"("mutedUserId");

-- CreateEnum
CREATE TYPE "GroupInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "GroupInvite" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "invitedUserId" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "status" "GroupInviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "GroupInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupInvite_groupId_invitedUserId_status_key" ON "GroupInvite"("groupId", "invitedUserId", "status");

-- CreateIndex
CREATE INDEX "GroupInvite_invitedUserId_idx" ON "GroupInvite"("invitedUserId");

-- AddForeignKey
ALTER TABLE "GroupInvite" ADD CONSTRAINT "GroupInvite_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CommunityGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN "collectiveTarget" INTEGER;
