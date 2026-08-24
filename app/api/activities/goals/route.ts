// app/api/activities/goals/route.ts
// GET lista as metas do usuário (com progresso real da semana atual).
// POST cria/atualiza (upsert por metric — @@unique([userId, metric])).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWeeklyActivityStats } from "@/lib/activity/stats";
import { checkActivityGoalCompletions, computeGoalProgress, getActivityWeekStreak, upsertActivityGoalSchema } from "@/lib/activity/goals";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const socialProfile = await prisma.socialProfile.findUnique({ where: { userId }, select: { timezone: true } });
  const timezone = socialProfile?.timezone;

  const [goals, weekStats, streak] = await Promise.all([
    prisma.activityGoal.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    getWeeklyActivityStats(prisma, userId, timezone),
    getActivityWeekStreak(prisma, userId, timezone),
  ]);

  const items = goals.map((goal) => ({ ...goal, progress: computeGoalProgress(goal, weekStats) }));

  return NextResponse.json({ goals: items, week: { start: weekStats.weekStartStr, end: weekStats.weekEndStr }, streak });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = upsertActivityGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Meta inválida", details: parsed.error.flatten() }, { status: 400 });
  }

  const goal = await prisma.activityGoal.upsert({
    where: { userId_metric: { userId, metric: parsed.data.metric } },
    create: { userId, metric: parsed.data.metric, target: parsed.data.target, isActive: true },
    update: { target: parsed.data.target, isActive: true },
  });

  const socialProfile = await prisma.socialProfile.findUnique({ where: { userId }, select: { timezone: true } });
  // A semana atual pode já satisfazer a meta recém-criada/reativada.
  await checkActivityGoalCompletions(prisma, userId, socialProfile?.timezone);

  return NextResponse.json({ goal }, { status: 201 });
}
