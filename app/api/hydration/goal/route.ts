// app/api/hydration/goal/route.ts
// GET/PATCH da meta diária de água — vive em Profile.dailyWaterGoalMl.
// Nunca chama reevaluateWaterGoalForDay aqui: mudar a meta isoladamente
// (inclusive para um valor abaixo do já consumido) nunca deve, por si só,
// conceder o evento WATER_GOAL_COMPLETED.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateWaterGoalSchema } from "@/lib/hydration/validation";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { userId }, select: { dailyWaterGoalMl: true } });
  if (!profile) return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });

  return NextResponse.json({ dailyWaterGoalMl: profile.dailyWaterGoalMl });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updateWaterGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Meta inválida", details: parsed.error.flatten() }, { status: 400 });
  }

  const { count } = await prisma.profile.updateMany({
    where: { userId },
    data: { dailyWaterGoalMl: parsed.data.dailyWaterGoalMl },
  });
  if (count === 0) return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });

  return NextResponse.json({ dailyWaterGoalMl: parsed.data.dailyWaterGoalMl });
}
