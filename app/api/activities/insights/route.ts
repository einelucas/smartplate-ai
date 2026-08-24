// app/api/activities/insights/route.ts
// Insights privados de atividade — estatísticas determinísticas sempre, + 1-3
// frases de IA (cache semanal, nunca gerado a cada request — ver
// lib/activity/insights.ts). Nunca exposto à Comunidade.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActivityInsights, getDeterministicActivityStats } from "@/lib/activity/insights";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const socialProfile = await prisma.socialProfile.findUnique({ where: { userId }, select: { timezone: true } });
  const timezone = socialProfile?.timezone;

  const stats = await getDeterministicActivityStats(prisma, userId, timezone);
  const aiResult = await getActivityInsights(userId, timezone, stats).catch((error) => {
    console.error("Erro ao gerar insights de atividade:", error);
    return null;
  });

  return NextResponse.json({
    stats: {
      thisWeek: stats.thisWeek,
      mostActiveWeek: stats.mostActiveWeek,
      consistency: stats.consistency,
      monthlyEvolution: stats.monthlyEvolution,
      mealAdherencePercentage: stats.mealAdherencePercentage,
    },
    insights: aiResult?.insights ?? [],
    insightsSource: aiResult?.source ?? "deterministic",
  });
}
