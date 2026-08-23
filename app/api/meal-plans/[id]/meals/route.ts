// app/api/meal-plans/[id]/meals/route.ts
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { safeParse } from "@/lib/mealplan";
import { recordMealCompletion } from "@/lib/community/gamification";

type Params = { params: Promise<{ id: string }> };
type MealType = "breakfast" | "lunch" | "dinner" | "snacks";

/**
 * PATCH /api/meal-plans/[id]/meals
 * Atualiza o estado (completed/rating/is_favorite) de uma refeição específica.
 * Body: { day: string, mealType: MealType, snackIndex?: number, patch: { completed?: boolean, rating?: number, is_favorite?: boolean } }
 */
export async function PATCH(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  try {
    const { day, mealType, snackIndex, patch } = await request.json();

    if (!day || !mealType || !patch)
      return NextResponse.json({ error: "Campos obrigatórios: day, mealType, patch" }, { status: 400 });

    const plan = await prisma.mealPlan.findUnique({ where: { id: params.id, userId }, select: { id: true } });
    if (!plan)
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });

    const dayPlan = await prisma.dayPlan.findUnique({
      where: { mealPlanId_day: { mealPlanId: params.id, day } },
    });
    if (!dayPlan)
      return NextResponse.json({ error: "Dia não encontrado" }, { status: 404 });

    const field = mealType as MealType;
    const updateData: Record<string, string> = {};
    let previousCompleted = false;

    if (field === "snacks") {
      const snacks = safeParse<any[]>(dayPlan.snacks) || [];
      if (typeof snackIndex !== "number" || !snacks[snackIndex])
        return NextResponse.json({ error: "snackIndex inválido" }, { status: 400 });
      previousCompleted = !!snacks[snackIndex].completed;
      snacks[snackIndex] = { ...snacks[snackIndex], ...patch };
      updateData.snacks = JSON.stringify(snacks);
    } else {
      const current = safeParse<any>(dayPlan[field]);
      if (!current)
        return NextResponse.json({ error: "Refeição não encontrada" }, { status: 404 });
      previousCompleted = !!current.completed;
      updateData[field] = JSON.stringify({ ...current, ...patch });
    }

    // Integração com gamificação: só concede XP na transição false -> true,
    // nunca em toggles repetidos (idempotência garantida por XpEvent.idempotencyKey).
    const becameCompleted = previousCompleted !== true && patch.completed === true;

    const { updated, gamificationResult } = await prisma.$transaction(async (tx) => {
      const updated = await tx.dayPlan.update({
        where: { mealPlanId_day: { mealPlanId: params.id, day } },
        data: updateData,
      });

      let gamificationResult: Awaited<ReturnType<typeof recordMealCompletion>> | null = null;
      if (becameCompleted) {
        const socialProfile = await tx.socialProfile.findUnique({
          where: { userId },
          select: { timezone: true },
        });
        gamificationResult = await recordMealCompletion(tx, {
          userId,
          timezone: socialProfile?.timezone,
          planId: params.id,
          mealType: field,
          snackIndex: field === "snacks" ? snackIndex : undefined,
        });
      }

      return { updated, gamificationResult };
    });

    return NextResponse.json({
      success: true,
      day: {
        ...updated,
        breakfast: safeParse(updated.breakfast),
        lunch: safeParse(updated.lunch),
        dinner: safeParse(updated.dinner),
        snacks: safeParse(updated.snacks),
      },
      gamification: gamificationResult
        ? {
            xpAwarded: gamificationResult.xpAwarded,
            newlyUnlocked: gamificationResult.newlyUnlocked,
            currentStreak: gamificationResult.currentStreak,
          }
        : null,
    });
  } catch (error) {
    console.error("Erro ao atualizar refeição:", error);
    return NextResponse.json({ error: "Erro ao atualizar refeição" }, { status: 500 });
  }
}
