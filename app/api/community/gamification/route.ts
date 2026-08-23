// app/api/community/gamification/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENTS, getLevelProgress } from "@/lib/community/achievements";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [gamification, unlockedAchievements] = await Promise.all([
    prisma.userGamification.findUnique({ where: { userId } }),
    prisma.userAchievement.findMany({ where: { userId }, orderBy: { unlockedAt: "desc" } }),
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
    achievements: unlockedAchievements.map((a) => ({
      code: a.achievementCode,
      unlockedAt: a.unlockedAt,
      ...(ACHIEVEMENTS as Record<string, { title: string; description: string; icon: string }>)[a.achievementCode],
    })),
  });
}
