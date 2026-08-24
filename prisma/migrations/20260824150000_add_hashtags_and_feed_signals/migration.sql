-- CreateEnum
CREATE TYPE "FeedFeedbackType" AS ENUM ('NOT_INTERESTED');

-- CreateTable
CREATE TABLE "Hashtag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hashtag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostHashtag" (
    "postId" TEXT NOT NULL,
    "hashtagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostHashtag_pkey" PRIMARY KEY ("postId","hashtagId")
);

-- CreateTable
CREATE TABLE "UserHashtagFollow" (
    "userId" TEXT NOT NULL,
    "hashtagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserHashtagFollow_pkey" PRIMARY KEY ("userId","hashtagId")
);

-- CreateTable
CREATE TABLE "PostFeedFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "type" "FeedFeedbackType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostFeedFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hashtag_slug_key" ON "Hashtag"("slug");

-- CreateIndex
CREATE INDEX "Hashtag_name_idx" ON "Hashtag"("name");

-- CreateIndex
CREATE INDEX "PostHashtag_hashtagId_idx" ON "PostHashtag"("hashtagId");

-- CreateIndex
CREATE INDEX "UserHashtagFollow_userId_idx" ON "UserHashtagFollow"("userId");

-- CreateIndex
CREATE INDEX "UserHashtagFollow_hashtagId_idx" ON "UserHashtagFollow"("hashtagId");

-- CreateIndex
CREATE INDEX "PostFeedFeedback_userId_idx" ON "PostFeedFeedback"("userId");

-- CreateIndex
CREATE INDEX "PostFeedFeedback_postId_idx" ON "PostFeedFeedback"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "PostFeedFeedback_userId_postId_type_key" ON "PostFeedFeedback"("userId", "postId", "type");

-- AddForeignKey
ALTER TABLE "PostHashtag" ADD CONSTRAINT "PostHashtag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostHashtag" ADD CONSTRAINT "PostHashtag_hashtagId_fkey" FOREIGN KEY ("hashtagId") REFERENCES "Hashtag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHashtagFollow" ADD CONSTRAINT "UserHashtagFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHashtagFollow" ADD CONSTRAINT "UserHashtagFollow_hashtagId_fkey" FOREIGN KEY ("hashtagId") REFERENCES "Hashtag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostFeedFeedback" ADD CONSTRAINT "PostFeedFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostFeedFeedback" ADD CONSTRAINT "PostFeedFeedback_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

