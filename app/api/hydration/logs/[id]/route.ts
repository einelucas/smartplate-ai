// app/api/hydration/logs/[id]/route.ts
// PATCH: corrige quantidade/data de um registro. DELETE: remove um registro.
// Propriedade é sempre confirmada no próprio comando de banco (WHERE com
// id + userId, nunca só um `if` depois de buscar por id isolado) — nunca
// permite acessar/editar/excluir registro de outro usuário.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalDateString } from "@/lib/community/dates";
import { updateWaterLogSchema } from "@/lib/hydration/validation";
import { reevaluateWaterGoalForDay } from "@/lib/hydration/gamification";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateWaterLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.amountMl === undefined && parsed.data.loggedAt === undefined) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const socialProfile = await prisma.socialProfile.findUnique({ where: { userId }, select: { timezone: true } });
  const timezone = socialProfile?.timezone;

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.waterLog.findFirst({ where: { id, userId } });
    if (!existing) return null;

    const { count } = await tx.waterLog.updateMany({
      where: { id, userId },
      data: {
        ...(parsed.data.amountMl !== undefined ? { amountMl: parsed.data.amountMl } : {}),
        ...(parsed.data.loggedAt !== undefined ? { loggedAt: parsed.data.loggedAt } : {}),
      },
    });
    if (count === 0) return null;

    const updated = await tx.waterLog.findFirstOrThrow({ where: { id, userId } });

    const oldLocalDateStr = getLocalDateString(existing.loggedAt, timezone);
    const newLocalDateStr = getLocalDateString(updated.loggedAt, timezone);
    await reevaluateWaterGoalForDay(tx, userId, timezone, oldLocalDateStr);
    if (newLocalDateStr !== oldLocalDateStr) {
      await reevaluateWaterGoalForDay(tx, userId, timezone, newLocalDateStr);
    }

    return updated;
  });

  if (!result) return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });
  return NextResponse.json({ log: { id: result.id, amountMl: result.amountMl, loggedAt: result.loggedAt.toISOString() } });
}

export async function DELETE(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const socialProfile = await prisma.socialProfile.findUnique({ where: { userId }, select: { timezone: true } });
  const timezone = socialProfile?.timezone;

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.waterLog.findFirst({ where: { id, userId } });
    if (!existing) return null;

    const { count } = await tx.waterLog.deleteMany({ where: { id, userId } });
    if (count === 0) return null;

    const localDateStr = getLocalDateString(existing.loggedAt, timezone);
    await reevaluateWaterGoalForDay(tx, userId, timezone, localDateStr);

    return existing;
  });

  if (!result) return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });
  return NextResponse.json({ success: true });
}
