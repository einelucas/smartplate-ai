// app/api/activities/summary/route.ts
// Resumo de atividades (semana local + mês local + última atividade) para
// Início e Perfil. Sempre calculado a partir da data local do usuário —
// nunca UTC puro — para não errar limites de semana/mês perto da virada.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalDateString, getLocalMonthRange, getLocalWeekRange } from "@/lib/community/dates";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const socialProfile = await prisma.socialProfile.findUnique({ where: { userId }, select: { timezone: true } });
  const timezone = socialProfile?.timezone;

  const now = new Date();
  const todayLocalStr = getLocalDateString(now, timezone);
  const { mondayStr, sundayStr } = getLocalWeekRange(todayLocalStr);
  const { firstStr, lastStr } = getLocalMonthRange(todayLocalStr);

  const lowerBoundStr = mondayStr < firstStr ? mondayStr : firstStr;
  const lowerBound = new Date(`${lowerBoundStr}T00:00:00.000Z`);
  lowerBound.setUTCDate(lowerBound.getUTCDate() - 2); // buffer de segurança contra offset de timezone
  const upperBound = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [recentActivities, lastActivity] = await Promise.all([
    prisma.activityLog.findMany({
      where: { userId, performedAt: { gte: lowerBound, lte: upperBound } },
      select: { activityType: true, customActivityName: true, durationMin: true, distanceKm: true, performedAt: true },
    }),
    prisma.activityLog.findFirst({ where: { userId }, orderBy: { performedAt: "desc" } }),
  ]);

  let weekCount = 0;
  let weekMinutes = 0;
  let monthCount = 0;
  let monthMinutes = 0;
  const monthDistinctDays = new Set<string>();

  for (const activity of recentActivities) {
    const localDateStr = getLocalDateString(activity.performedAt, timezone);
    if (localDateStr >= mondayStr && localDateStr <= sundayStr) {
      weekCount += 1;
      weekMinutes += activity.durationMin;
    }
    if (localDateStr >= firstStr && localDateStr <= lastStr) {
      monthCount += 1;
      monthMinutes += activity.durationMin;
      monthDistinctDays.add(localDateStr);
    }
  }

  return NextResponse.json({
    thisWeek: { count: weekCount, minutes: weekMinutes },
    thisMonth: { count: monthCount, minutes: monthMinutes, distinctDays: monthDistinctDays.size },
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
