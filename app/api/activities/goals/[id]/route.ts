// app/api/activities/goals/[id]/route.ts
// PATCH: atualizar target e/ou isActive (só o dono). DELETE: remover.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ACTIVITY_GOAL_TARGET_RANGES, checkActivityGoalCompletions, updateActivityGoalSchema } from "@/lib/activity/goals";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const goal = await prisma.activityGoal.findUnique({ where: { id } });
  if (!goal || goal.userId !== userId) return NextResponse.json({ error: "Meta não encontrada" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = updateActivityGoalSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.target !== undefined) {
    const [min, max] = ACTIVITY_GOAL_TARGET_RANGES[goal.metric];
    if (parsed.data.target < min || parsed.data.target > max) {
      return NextResponse.json({ error: "Meta fora da faixa permitida" }, { status: 400 });
    }
  }

  const updated = await prisma.activityGoal.update({ where: { id }, data: parsed.data });

  if (updated.isActive) {
    const socialProfile = await prisma.socialProfile.findUnique({ where: { userId }, select: { timezone: true } });
    await checkActivityGoalCompletions(prisma, userId, socialProfile?.timezone);
  }

  return NextResponse.json({ goal: updated });
}

export async function DELETE(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const goal = await prisma.activityGoal.findUnique({ where: { id } });
  if (!goal || goal.userId !== userId) return NextResponse.json({ error: "Meta não encontrada" }, { status: 404 });

  await prisma.activityGoal.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
