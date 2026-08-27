// app/api/community/gamification/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENTS, getLevelProgress } from "@/lib/community/achievements";
import { getXpBreakdown, getXpEventsToday } from "@/lib/community/gamification";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const socialProfile = await prisma.socialProfile.findUnique({ where: { userId }, select: { timezone: true } });

  const [gamification, unlockedAchievements, xpBreakdown, xpToday] = await Promise.all([
    prisma.userGamification.findUnique({ where: { userId } }),
    prisma.userAchievement.findMany({ where: { userId }, orderBy: { unlockedAt: "desc" } }),
    getXpBreakdown(userId),
    getXpEventsToday(userId, socialProfile?.timezone),
  ]);

  const totalXp = gamification?.totalXp ?? 0;
  const { level, currentLevelXp, nextLevelXp } = getLevelProgress(totalXp);

  return NextResponse.json({
    totalXp,
    currentStreak: gamification?.currentStreak ?? 0,
    longestStreak: gamification?.longestStreak ?? 0,
    level,
    currentLevelXp,
    nextLevelXp,
    xpBreakdown,
    xpToday,
    achievements: unlockedAchievements.map((a) => ({
      code: a.achievementCode,
      unlockedAt: a.unlockedAt,
      ...(ACHIEVEMENTS as Record<string, { title: string; description: string; icon: string }>)[a.achievementCode],
    })),
  });
}
