// app/api/activities/summary/route.ts
// Resumo de atividades (semana local + mês local + última atividade) para
// Início e Perfil. Toda a agregação vem de lib/activity/stats.ts — nunca
// recalculada de outra forma aqui.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMonthlyActivityStats, getWeeklyActivityStats, getLastEligibleActivity } from "@/lib/activity/stats";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const socialProfile = await prisma.socialProfile.findUnique({ where: { userId }, select: { timezone: true } });
  const timezone = socialProfile?.timezone;

  const [weekly, monthly, lastActivity] = await Promise.all([
    getWeeklyActivityStats(prisma, userId, timezone),
    getMonthlyActivityStats(prisma, userId, timezone),
    getLastEligibleActivity(prisma, userId),
  ]);

  return NextResponse.json({
    thisWeek: { count: weekly.count, minutes: weekly.minutes, distinctDays: weekly.distinctDays },
    thisMonth: {
      count: monthly.count,
      minutes: monthly.minutes,
      distinctDays: monthly.distinctDays,
      mostPracticed: monthly.mostPracticed,
    },
    lastActivity: lastActivity
      ? {
          activityType: lastActivity.activityType,
          customActivityName: lastActivity.customActivityName,
          durationMin: lastActivity.durationMin,
          distanceKm: lastActivity.distanceKm,
          performedAt: lastActivity.performedAt,
        }
      : null,
  });
}
