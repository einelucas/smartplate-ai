// app/api/community/posts/route.ts
// Cria posts. Conquista/streak nunca confiam em metadata do cliente — o
// servidor sempre reverifica contra UserAchievement/UserGamification.
// PLAN_SHARE sempre valida que o SharedPlan pertence ao autor.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createPostSchema } from "@/lib/community/validation";
import { AuthzError, requireGroupMembership } from "@/lib/community/authz";
import { ACHIEVEMENTS } from "@/lib/community/achievements";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const socialProfile = await prisma.socialProfile.findUnique({ where: { userId } });
  if (!socialProfile) return NextResponse.json({ error: "Visite a Comunidade antes de publicar" }, { status: 400 });
  if (!socialProfile.termsAcceptedAt) {
    return NextResponse.json({ error: "É necessário aceitar as Regras da Comunidade antes de publicar" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { type, groupId, text } = parsed.data;

  if (groupId) {
    try {
      await requireGroupMembership(prisma, groupId, userId);
    } catch (error) {
      if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
      throw error;
    }
  }

  let metadata: Record<string, unknown> = {};

  if (type === "ACHIEVEMENT") {
    const code = parsed.data.achievementCode as string;
    const unlocked = await prisma.userAchievement.findUnique({
      where: { userId_achievementCode: { userId, achievementCode: code } },
    });
    if (!unlocked) return NextResponse.json({ error: "Conquista não desbloqueada" }, { status: 403 });
    const def = (ACHIEVEMENTS as Record<string, { title: string; description: string; emoji: string }>)[code];
    if (!def) return NextResponse.json({ error: "Conquista inválida" }, { status: 400 });
    metadata = { achievementCode: code, title: def.title, description: def.description, emoji: def.emoji };
  } else if (type === "STREAK") {
    const milestone = parsed.data.streakMilestone as number;
    const gamification = await prisma.userGamification.findUnique({ where: { userId } });
    if (!gamification || gamification.longestStreak < milestone) {
      return NextResponse.json({ error: "Marco de streak ainda não alcançado" }, { status: 403 });
    }
    metadata = { milestone };
  } else if (type === "PLAN_SHARE") {
    const shareToken = parsed.data.shareToken as string;
    const shared = await prisma.sharedPlan.findUnique({ where: { shareToken }, include: { mealPlan: true } });
    if (!shared || shared.mealPlan.userId !== userId) {
      return NextResponse.json({ error: "Link de compartilhamento inválido" }, { status: 403 });
    }
    if (shared.expiresAt && shared.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Link de compartilhamento expirado" }, { status: 403 });
    }
    metadata = { shareToken, planName: shared.mealPlan.name ?? null, dietType: shared.mealPlan.dietType };
  }

  const post = await prisma.communityPost.create({
    data: {
      authorUserId: userId,
      groupId: groupId ?? null,
      type,
      text: text ?? null,
      metadata: metadata as Prisma.InputJsonObject,
    },
  });

  return NextResponse.json({ post }, { status: 201 });
}
