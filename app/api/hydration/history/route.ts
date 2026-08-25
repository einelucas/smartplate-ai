// app/api/hydration/history/route.ts
// GET: histórico da semana local (segunda a domingo) que contém a data
// informada (default hoje) — 7 entradas, com total/meta/dias batidos.
// Limite de período fixo (uma semana) evita queries excessivamente grandes.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWeeklyHistory } from "@/lib/hydration/stats";
import { localDateQuerySchema } from "@/lib/hydration/validation";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const rawDate = searchParams.get("date");
  if (rawDate && !localDateQuerySchema.safeParse(rawDate).success) {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }

  const socialProfile = await prisma.socialProfile.findUnique({ where: { userId }, select: { timezone: true } });
  const days = await getWeeklyHistory(prisma, userId, socialProfile?.timezone, rawDate ?? undefined);

  return NextResponse.json({ days });
}
