// app/api/activities/route.ts
// ActivityLog é privado por padrão — sempre resolve o dono pela autenticação,
// nunca aceita userId do cliente.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createActivityLogSchema } from "@/lib/activity/validation";
import { ACTIVITY_TYPE_VALUES } from "@/lib/activity/options";
import { recordActivityLog } from "@/lib/community/gamification";
import { checkActivityGoalCompletions } from "@/lib/activity/goals";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const type = searchParams.get("type");

  const where: Record<string, unknown> = { userId };
  if (from || to) {
    where.performedAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  if (type && (ACTIVITY_TYPE_VALUES as readonly string[]).includes(type)) {
    where.activityType = type;
  }

  const activities = await prisma.activityLog.findMany({
    where,
    orderBy: { performedAt: "desc" },
    include: { sharedPost: { select: { id: true } } },
  });

  return NextResponse.json({ activities });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createActivityLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const activity = await tx.activityLog.create({
        data: {
          userId,
          activityType: data.activityType,
          customActivityName: data.activityType === "OTHER" ? data.customActivityName?.trim() || null : null,
          durationMin: data.durationMin,
          distanceKm: data.distanceKm ?? null,
          intensity: data.intensity ?? null,
          notes: data.notes?.trim() || null,
          performedAt: data.performedAt,
        },
      });

      const socialProfile = await tx.socialProfile.findUnique({ where: { userId }, select: { timezone: true } });

      const gamification = await recordActivityLog(tx, {
        userId,
        timezone: socialProfile?.timezone,
        activityId: activity.id,
        durationMin: activity.durationMin,
        performedAt: activity.performedAt,
      });

      // Metas de atividade são pessoais/opcionais — nunca afetam XP/streak
      // geral acima; só registram (idempotente) que a meta foi atingida.
      await checkActivityGoalCompletions(tx, userId, socialProfile?.timezone);

      return { activity, gamification };
    });

    return NextResponse.json(
      {
        activity: result.activity,
        gamification: {
          xpAwarded: result.gamification.xpAwarded,
          currentStreak: result.gamification.currentStreak,
          newlyUnlocked: result.gamification.newlyUnlocked,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao registrar atividade:", error);
    return NextResponse.json({ error: "Erro ao registrar atividade" }, { status: 500 });
  }
}
