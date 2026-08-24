// app/api/integrations/strava/activities/route.ts
// Lista o cache privado de atividades Strava do usuário autenticado — nunca
// de outro usuário, nunca pública. Usada para compor o histórico privado
// combinado (SmartPlate + Strava) no frontend, sem juntar com ActivityLog no
// backend (mantém as duas fontes claramente separadas).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { purgeExpiredExternalActivityCache } from "@/lib/integrations/external-activity-cache";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await purgeExpiredExternalActivityCache(userId);

  const activities = await prisma.externalActivityCache.findMany({
    where: { userId },
    orderBy: { performedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ activities });
}
