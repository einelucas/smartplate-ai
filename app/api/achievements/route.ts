// app/api/achievements/route.ts
// Fonte de verdade da tela "Todas as conquistas". Roda reconciliação a cada
// GET (idempotente — nunca duplica, nunca sobrescreve unlockedAt existente)
// para que contas antigas recebam retroativamente conquistas já cumpridas.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ACHIEVEMENT_TOTAL } from "@/lib/community/achievement-catalog";
import { reconcileAchievements } from "@/lib/community/achievement-engine";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { results, newlyUnlocked } = await reconcileAchievements(userId);

  const unlockedCount = results.filter((r) => r.status === "UNLOCKED").length;
  const total = ACHIEVEMENT_TOTAL;
  const percentage = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

  return NextResponse.json({
    summary: { unlocked: unlockedCount, total, percentage },
    achievements: results,
    newlyUnlocked,
  });
}
