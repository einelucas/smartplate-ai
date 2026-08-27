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
import { getAchievementDisplay } from "@/lib/community/achievements";
import { ACHIEVEMENT_CATALOG, ACHIEVEMENT_RARITY_XP, getAchievementRarity } from "@/lib/community/achievement-catalog";
import { copyPrivateImage, deletePrivateImage } from "@/lib/storage/blob";
import { exceedsHashtagLimit, syncPostHashtags, MAX_HASHTAGS_PER_POST } from "@/lib/community/hashtags";
import { RATE_LIMITS, RateLimitError, checkRateLimit, windowStart } from "@/lib/community/rate-limit";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const socialProfile = await prisma.socialProfile.findUnique({ where: { userId } });
  if (!socialProfile) return NextResponse.json({ error: "Visite a Comunidade antes de publicar" }, { status: 400 });
  if (!socialProfile.termsAcceptedAt) {
    return NextResponse.json({ error: "É necessário aceitar as Regras da Comunidade antes de publicar" }, { status: 403 });
  }

  try {
    await checkRateLimit(
      () => prisma.communityPost.count({ where: { authorUserId: userId, createdAt: { gte: windowStart(RATE_LIMITS.createPost.windowMinutes) } } }),
      RATE_LIMITS.createPost
    );
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { type, groupId, text } = parsed.data;

  if (exceedsHashtagLimit(text)) {
    return NextResponse.json({ error: `Máximo de ${MAX_HASHTAGS_PER_POST} hashtags por publicação` }, { status: 400 });
  }

  if (groupId) {
    try {
      await requireGroupMembership(prisma, groupId, userId);
    } catch (error) {
      if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
      throw error;
    }
  }

  let metadata: Record<string, unknown> = {};

  // Foto genérica (TEXT e ACTIVITY) — precisa ter sido enviada por este MESMO
  // usuário (pathname sempre "{folder}/{userId}/...", nunca aceitar de outra
  // pessoa). Upload em si já aconteceu antes desta chamada (ver
  // /api/community/media/upload); aqui só validamos e referenciamos.
  const genericImageUrl = parsed.data.imageUrl;
  if (genericImageUrl && genericImageUrl.split("/")[1] !== userId) {
    return NextResponse.json({ error: "Imagem inválida" }, { status: 403 });
  }
  // Dimensões só fazem sentido junto de uma imagem — nunca persistidas sozinhas.
  // Usadas só pelo feed pra reservar o espaço da imagem antes dela carregar
  // (evita o card "crescer" enquanto a imagem baixa) — nunca por lógica de negócio.
  const genericImageDimensions =
    genericImageUrl && parsed.data.imageWidth && parsed.data.imageHeight
      ? { imageWidth: parsed.data.imageWidth, imageHeight: parsed.data.imageHeight }
      : {};

  if (type === "TEXT") {
    if (genericImageUrl) metadata = { imageUrl: genericImageUrl, ...genericImageDimensions };
  } else if (type === "ACHIEVEMENT") {
    const code = parsed.data.achievementCode as string;
    const unlocked = await prisma.userAchievement.findUnique({
      where: { userId_achievementCode: { userId, achievementCode: code } },
    });
    if (!unlocked) return NextResponse.json({ error: "Conquista não desbloqueada" }, { status: 403 });
    const def = getAchievementDisplay(code);
    if (!def) return NextResponse.json({ error: "Conquista inválida" }, { status: 400 });
    // Raridade/XP sempre derivados aqui a partir do catálogo — nunca aceitos
    // do cliente (mesma regra de "achievementCode não confia em metadata").
    const rarity = getAchievementRarity(ACHIEVEMENT_CATALOG[code] ?? {});
    metadata = {
      achievementCode: code,
      title: def.title,
      description: def.description,
      icon: def.icon,
      rarity,
      xp: ACHIEVEMENT_RARITY_XP[rarity],
      ...(genericImageUrl ? { imageUrl: genericImageUrl, ...genericImageDimensions } : {}),
    };
  } else if (type === "STREAK") {
    const milestone = parsed.data.streakMilestone as number;
    const gamification = await prisma.userGamification.findUnique({ where: { userId } });
    if (!gamification || gamification.longestStreak < milestone) {
      return NextResponse.json({ error: "Marco de streak ainda não alcançado" }, { status: 403 });
    }
    metadata = { milestone };
  } else if (type === "CHALLENGE") {
    const challengeId = parsed.data.challengeId as string;
    const participant = await prisma.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
      include: { challenge: true },
    });
    if (!participant || !participant.completedAt) {
      return NextResponse.json({ error: "Desafio ainda não concluído" }, { status: 403 });
    }
    // Título/métrica/meta sempre re-derivados do banco — nunca do que o
    // cliente mandou (mesma regra de ACHIEVEMENT/ACTIVITY acima).
    metadata = {
      challengeId,
      title: participant.challenge.title,
      description: participant.challenge.description,
      metric: participant.challenge.metric,
      target: participant.challenge.target,
      completedAt: participant.completedAt,
    };
  } else if (type === "PLAN_SHARE" && parsed.data.mealName) {
    // Snapshot de uma refeição específica — nunca uma referência viva (ver
    // lib/community/post-draft.ts). Macros só entram no metadata quando o
    // próprio usuário escolheu mostrá-los (showMacros); ingredientes sempre
    // acompanham quando enviados (requisito mínimo de "receita" compartilhada,
    // não opcional como as macros). A Zod já garante que valores fora de
    // faixa/tamanho nunca chegam aqui.
    metadata = {
      mealName: parsed.data.mealName,
      showMacros: !!parsed.data.showMacros,
      ...(parsed.data.showMacros
        ? {
            mealCalories: parsed.data.mealCalories ?? null,
            mealProtein: parsed.data.mealProtein ?? null,
            mealCarbs: parsed.data.mealCarbs ?? null,
            mealFat: parsed.data.mealFat ?? null,
          }
        : {}),
      ...(parsed.data.mealIngredients?.length ? { mealIngredients: parsed.data.mealIngredients } : {}),
      ...(genericImageUrl ? { imageUrl: genericImageUrl, ...genericImageDimensions } : {}),
    };
  } else if (type === "PLAN_SHARE") {
    const shareToken = parsed.data.shareToken as string;
    const shared = await prisma.sharedPlan.findUnique({ where: { shareToken }, include: { mealPlan: true } });
    if (!shared || shared.mealPlan.userId !== userId) {
      return NextResponse.json({ error: "Link de compartilhamento inválido" }, { status: 403 });
    }
    if (shared.expiresAt && shared.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Link de compartilhamento expirado" }, { status: 403 });
    }
    metadata = {
      shareToken,
      planName: shared.mealPlan.name ?? null,
      dietType: shared.mealPlan.dietType,
      ...(genericImageUrl ? { imageUrl: genericImageUrl, ...genericImageDimensions } : {}),
    };
  } else if (type === "ACTIVITY") {
    const activityLogId = parsed.data.activityLogId as string;
    const activityLog = await prisma.activityLog.findUnique({ where: { id: activityLogId }, include: { sharedPost: { select: { id: true } } } });
    if (!activityLog || activityLog.userId !== userId) {
      return NextResponse.json({ error: "Atividade não encontrada" }, { status: 403 });
    }
    if (activityLog.sharedPost) {
      return NextResponse.json({ error: "Esta atividade já foi compartilhada" }, { status: 409 });
    }
    // Snapshot seguro — só campos do próprio ActivityLog, nunca dados
    // privados de Profile (peso, altura, objetivo, birthDate etc.). XP
    // exibido é o realmente concedido (soma de XpEvent), nunca hardcoded.
    const xpSum = await prisma.xpEvent.aggregate({
      where: { userId, referenceType: "ActivityLog", referenceId: activityLogId },
      _sum: { points: true },
    });
    metadata = {
      activityType: activityLog.activityType,
      customActivityName: activityLog.customActivityName,
      durationMin: activityLog.durationMin,
      distanceKm: activityLog.distanceKm,
      intensity: activityLog.intensity,
      notes: activityLog.notes,
      performedAt: activityLog.performedAt,
      xpAwarded: xpSum._sum.points ?? 0,
      // Imagem é sempre escolhida manualmente pelo usuário no momento do
      // compartilhamento — nunca copiada de dado privado do ActivityLog/API
      // externa (Strava permanece privado; ver provider-policy.ts).
      ...(genericImageUrl ? { imageUrl: genericImageUrl, ...genericImageDimensions } : {}),
    };
  } else if (type === "EXTERNAL_SHARE") {
    // Conteúdo é sempre o que o próprio usuário forneceu — nunca buscamos
    // nem redistribuímos dado de nenhuma API externa aqui (sem scraping).
    // url já foi validada (https-only) pelo createPostSchema; imageUrl
    // precisa ter sido gerada pelo upload deste MESMO usuário (nunca aceitar
    // a URL de upload de outra pessoa).
    const imageUrl = parsed.data.externalShareImageUrl;
    if (imageUrl && !imageUrl.startsWith(`external-shares/${userId}/`)) {
      return NextResponse.json({ error: "Imagem inválida" }, { status: 403 });
    }
    metadata = {
      provider: parsed.data.externalShareProvider,
      url: parsed.data.externalShareUrl ?? null,
      imageUrl: imageUrl ?? null,
    };
  } else if (type === "PROGRESS_SHARE") {
    const progressPhotoId = parsed.data.progressPhotoId as string;
    const photo = await prisma.progressPhoto.findUnique({ where: { id: progressPhotoId } });
    if (!photo || photo.userId !== userId) {
      return NextResponse.json({ error: "Foto de progresso não encontrada" }, { status: 403 });
    }

    // Cópia deliberada — ProgressPhoto continua privado por padrão; o post
    // recebe seu próprio blob, nunca um link ao registro original.
    const copied = await copyPrivateImage(photo.imageUrl, { folder: "community", userId });
    if (!copied) {
      return NextResponse.json({ error: "Não foi possível compartilhar esta foto" }, { status: 500 });
    }

    const showWeight = !!parsed.data.showWeight;
    metadata = {
      imageUrl: copied.pathname,
      takenAt: photo.takenAt,
      showWeight,
      ...(showWeight ? { weight: photo.weight } : {}),
    };
  }

  try {
    const post = await prisma.$transaction(async (tx) => {
      const created = await tx.communityPost.create({
        data: {
          authorUserId: userId,
          groupId: groupId ?? null,
          type,
          text: text ?? null,
          metadata: metadata as Prisma.InputJsonObject,
          ...(type === "ACTIVITY" ? { activityLogId: parsed.data.activityLogId as string } : {}),
        },
      });
      await syncPostHashtags(tx, created.id, text);
      return created;
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    // Upload do Blob já aconteceu antes desta chamada — se o insert falhar,
    // remove o arquivo pra não deixar órfão (mesmo padrão de progress-photos).
    const orphanImageUrl = (metadata as { imageUrl?: string | null }).imageUrl;
    if (orphanImageUrl) await deletePrivateImage(orphanImageUrl);
    console.error("Erro ao criar post:", error);
    return NextResponse.json({ error: "Não foi possível publicar." }, { status: 500 });
  }
}
