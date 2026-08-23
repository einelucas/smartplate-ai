// app/api/activities/[id]/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateActivityLogSchema } from "@/lib/activity/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  const activity = await prisma.activityLog.findUnique({ where: { id: params.id } });
  if (!activity || activity.userId !== userId) {
    return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateActivityLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const nextActivityType = data.activityType ?? activity.activityType;
  const nextCustomName = data.customActivityName !== undefined ? data.customActivityName?.trim() || null : activity.customActivityName;
  if (nextActivityType === "OTHER" && !nextCustomName) {
    return NextResponse.json({ error: "Informe o nome da atividade" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (data.activityType !== undefined) updateData.activityType = data.activityType;
  if (data.activityType !== undefined || data.customActivityName !== undefined) {
    updateData.customActivityName = nextActivityType === "OTHER" ? nextCustomName : null;
  }
  if (data.durationMin !== undefined) updateData.durationMin = data.durationMin;
  if (data.distanceKm !== undefined) updateData.distanceKm = data.distanceKm;
  if (data.intensity !== undefined) updateData.intensity = data.intensity;
  if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
  if (data.performedAt !== undefined) updateData.performedAt = data.performedAt;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
  }

  // Editar NUNCA reavalia/concede XP — os XpEvent já criados na criação
  // (activity:base/duration/first-of-day) permanecem como estão, mesmo que
  // duração/data mudem. Isso impede farm via edição (tarefa #20).
  const updated = await prisma.activityLog.update({ where: { id: params.id }, data: updateData });

  return NextResponse.json({ activity: updated });
}

export async function DELETE(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  const activity = await prisma.activityLog.findUnique({ where: { id: params.id } });
  if (!activity || activity.userId !== userId) {
    return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });
  }

  // XP já concedido NÃO é revertido — XpEvent é um ledger imutável (mesma
  // filosofia já documentada no README) e o teto diário de XP de atividade
  // (DailyActivity.activityXpEarned) nunca é decrementado. Isso é o que
  // impede o abuso "criar → ganhar XP → excluir → criar de novo → XP
  // infinito": o teto do dia já foi consumido e não volta ao remover o
  // registro. O post compartilhado (se existir) perde a referência via
  // onDelete: SetNull, mas mantém seu snapshot — não é apagado.
  await prisma.activityLog.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
