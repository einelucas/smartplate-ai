// app/api/community/groups/[id]/stats/route.ts
// Estatísticas agregadas do grupo (leitura pura, nenhum model novo de
// escrita) — janela semanal uniforme em UTC, mesmo padrão do ranking geral
// (lib/community/dates.ts::getUtcWeekWindow — não ajustada por timezone
// individual, simplificação já adotada no resto do produto).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireGroupMembership } from "@/lib/community/authz";
import { getUtcWeekWindow } from "@/lib/community/dates";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  try {
    await requireGroupMembership(prisma, params.id, userId);
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const members = await prisma.groupMember.findMany({ where: { groupId: params.id }, select: { userId: true } });
  const memberIds = members.map((m) => m.userId);
  const { start, end } = getUtcWeekWindow();

  const [activeMemberCount, activityCount, mealsCompletedCount] = await Promise.all([
    prisma.dailyActivity
      .findMany({ where: { userId: { in: memberIds }, date: { gte: start, lte: end } }, select: { userId: true }, distinct: ["userId"] })
      .then((rows) => rows.length),
    prisma.activityLog.count({ where: { userId: { in: memberIds }, performedAt: { gte: start, lte: end } } }),
    prisma.meal.count({
      where: { completed: true, updatedAt: { gte: start, lte: end }, dayPlan: { mealPlan: { userId: { in: memberIds } } } },
    }),
  ]);

  return NextResponse.json({
    memberCount: memberIds.length,
    weekStart: start,
    weekEnd: end,
    activeMemberCount,
    activityCount,
    mealsCompletedCount,
  });
}
