// app/api/meal-plans/[id]/route.ts
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { safeParse } from "@/lib/mealplan";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Params) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  try {
    const plan = await prisma.mealPlan.findUnique({
      where: { id: params.id, userId },
      include: { days: true },
    });

    if (!plan)
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });

    return NextResponse.json({ plan: parsePlanDays(plan) });
  } catch (error) {
    console.error("Erro ao buscar plano:", error);
    return NextResponse.json({ error: "Erro ao buscar plano" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: Params) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  try {
    await prisma.mealPlan.delete({ where: { id: params.id, userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar plano:", error);
    return NextResponse.json({ error: "Erro ao deletar plano" }, { status: 500 });
  }
}

/**
 * PATCH /api/meal-plans/[id]
 * Aceita: { name?: string, favorite?: boolean }
 * Unifica o endpoint /favorite que existia separadamente.
 */
export async function PATCH(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  try {
    const body = await request.json();
    const updateData: Record<string, any> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.favorite !== undefined) updateData.favorite = body.favorite;

    if (Object.keys(updateData).length === 0)
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });

    const updated = await prisma.mealPlan.update({
      where: { id: params.id, userId },
      data: updateData,
    });

    return NextResponse.json({ success: true, plan: updated });
  } catch (error) {
    console.error("Erro ao atualizar plano:", error);
    return NextResponse.json({ error: "Erro ao atualizar plano" }, { status: 500 });
  }
}

// ─── helpers ────────────────────────────────────────────────────────────────

function parsePlanDays(plan: any) {
  return {
    ...plan,
    days: plan.days.map((day: any) => ({
      ...day,
      breakfast: safeParse(day.breakfast),
      lunch: safeParse(day.lunch),
      dinner: safeParse(day.dinner),
      snacks: safeParse(day.snacks),
    })),
  };
}
