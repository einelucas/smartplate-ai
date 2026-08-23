-- DropForeignKey
ALTER TABLE "CommunityGroup" DROP CONSTRAINT "CommunityGroup_ownerUserId_fkey";

-- AddForeignKey
ALTER TABLE "CommunityGroup" ADD CONSTRAINT "CommunityGroup_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
