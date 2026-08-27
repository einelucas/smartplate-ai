// app/api/community/me/route.ts
// GET: garante e retorna o SocialProfile + resumo de gamificação do usuário
// autenticado (cria automaticamente no primeiro acesso à Comunidade).
// PATCH: edita perfil social / privacidade / aceite dos termos.
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureSocialProfile } from "@/lib/community/social-profile";
import { updateSocialProfileSchema } from "@/lib/community/validation";
import { getLevelProgress } from "@/lib/community/achievements";
import { isReservedUsername } from "@/lib/profile/validation";
import { pickProviderAvatarUrl, resolveAvatarUrl } from "@/lib/community/avatar";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const socialProfile = await ensureSocialProfile(userId);
  const [gamification, achievementsCount, profileRole] = await Promise.all([
    prisma.userGamification.findUnique({ where: { userId } }),
    prisma.userAchievement.count({ where: { userId } }),
    prisma.profile.findUnique({ where: { userId }, select: { role: true } }),
  ]);

  const totalXp = gamification?.totalXp ?? 0;
  const { level, currentLevelXp, nextLevelXp } = getLevelProgress(totalXp);

  return NextResponse.json({
    profile: {
      userId,
      role: profileRole?.role ?? "USER",
      username: socialProfile.username,
      displayName: socialProfile.displayName,
      avatarUrl: resolveAvatarUrl(socialProfile),
      hasCustomAvatar: Boolean(socialProfile.customAvatarUrl),
      bio: socialProfile.bio,
      timezone: socialProfile.timezone,
      isDiscoverable: socialProfile.isDiscoverable,
      showStreak: socialProfile.showStreak,
      showXp: socialProfile.showXp,
      showAchievements: socialProfile.showAchievements,
      notifySocial: socialProfile.notifySocial,
      notifyMeals: socialProfile.notifyMeals,
      notifyActivities: socialProfile.notifyActivities,
      notifyChallenges: socialProfile.notifyChallenges,
      notifyStreak: socialProfile.notifyStreak,
      notifyProgress: socialProfile.notifyProgress,
      notifyReminders: socialProfile.notifyReminders,
      termsAcceptedAt: socialProfile.termsAcceptedAt,
    },
    gamification: {
      totalXp,
      currentStreak: gamification?.currentStreak ?? 0,
      longestStreak: gamification?.longestStreak ?? 0,
      level,
      currentLevelXp,
      nextLevelXp,
      achievementsCount,
    },
  });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updateSocialProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  await ensureSocialProfile(userId);

  const { acceptTerms, username, ...rest } = parsed.data;

  if (username) {
    if (isReservedUsername(username)) {
      return NextResponse.json({ error: "Este nome de usuário não está disponível" }, { status: 400 });
    }
    const existing = await prisma.socialProfile.findUnique({ where: { username }, select: { userId: true } });
    if (existing && existing.userId !== userId) {
      return NextResponse.json({ error: "Nome de usuário já em uso" }, { status: 409 });
    }
  }

  // Sempre que a foto personalizada é tocada (setada ou removida), reaproveita
  // esta mesma chamada pra também atualizar o fallback do provedor a partir
  // das contas externas reais do Clerk — nunca a partir de um valor enviado
  // pelo cliente. Nunca sobrescreve providerAvatarUrl fora deste caso.
  const data: Prisma.SocialProfileUpdateInput = {
    ...rest,
    ...(username ? { username } : {}),
    ...(acceptTerms ? { termsAcceptedAt: new Date() } : {}),
  };
  if ("customAvatarUrl" in rest) {
    const clerkUser = await currentUser();
    data.providerAvatarUrl = pickProviderAvatarUrl(clerkUser?.externalAccounts ?? []);
  }

  try {
    const updated = await prisma.socialProfile.update({ where: { userId }, data });

    return NextResponse.json({
      profile: {
        ...updated,
        avatarUrl: resolveAvatarUrl(updated),
        hasCustomAvatar: Boolean(updated.customAvatarUrl),
      },
    });
  } catch (error) {
    // Corrida real: outro request salvou o mesmo username entre a checagem acima e este update.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Nome de usuário já em uso" }, { status: 409 });
    }
    throw error;
  }
}
