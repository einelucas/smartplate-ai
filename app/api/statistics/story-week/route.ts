import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalDateString, getLocalWeekRange, toUtcDateOnly, withTimezoneBuffer } from "@/lib/community/dates";
import { getWeeklyHistory } from "@/lib/hydration/stats";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const profile = await prisma.socialProfile.findUnique({ where: { userId }, select: { timezone: true } });
    const timezone = profile?.timezone;
    const today = getLocalDateString(new Date(), timezone);
    const { mondayStr } = getLocalWeekRange(today);
    const [days, water, meals] = await Promise.all([
      prisma.dailyActivity.findMany({
        where: { userId, date: { gte: toUtcDateOnly(mondayStr), lte: toUtcDateOnly(today) } },
        select: { qualifiesForStreak: true, waterGoalCompleted: true },
      }),
      getWeeklyHistory(prisma, userId, timezone, today),
      prisma.xpEvent.findMany({
        where: { userId, eventType: "MEAL_COMPLETED", createdAt: withTimezoneBuffer(mondayStr, today) },
        select: { createdAt: true },
      }),
    ]);
    const mealCount = meals.filter(({ createdAt }) => {
      const day = getLocalDateString(createdAt, timezone);
      return day >= mondayStr && day <= today;
    }).length;
    return NextResponse.json({
      start: mondayStr, end: today,
      activeDays: days.filter(d => d.qualifiesForStreak).length,
      mealCount,
      waterMl: water.filter(d => d.date <= today).reduce((sum, d) => sum + d.totalMl, 0),
      waterGoalDays: days.filter(d => d.waterGoalCompleted).length,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Erro ao carregar resumo para story", error);
    return NextResponse.json({ error: "Não foi possível carregar o resumo." }, { status: 500 });
  }
}
