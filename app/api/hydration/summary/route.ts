// app/api/hydration/summary/route.ts
// GET: resumo diário (total, meta, restante, percentual, logs) de uma data
// local (default hoje). Wrapper fino sobre lib/hydration/stats — nunca
// recalcula aqui.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDailySummary } from "@/lib/hydration/stats";
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
  const summary = await getDailySummary(prisma, userId, socialProfile?.timezone, rawDate ?? undefined);

  return NextResponse.json(summary);
}
