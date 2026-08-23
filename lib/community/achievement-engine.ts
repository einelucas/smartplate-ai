// lib/community/achievement-engine.ts
// Avaliação e desbloqueio das 50 conquistas do catálogo novo
// (achievement-catalog.ts). Backend é a única autoridade: tudo aqui deriva
// de dados já persistidos, nunca de algo enviado pelo cliente.
//
// Estratégia: reconciliação em tempo de consulta (reconcileAchievements),
// chamada sempre que GET /api/achievements roda. Isso cobre tanto o caso
// "ação real acabou de acontecer" quanto retroatividade para contas antigas
// (seções 55-57 do checklist) sem precisar espalhar chamadas de avaliação
// em cada endpoint que toca refeições/peso/fotos/social — a mesma
// verificação idempotente resolve os dois casos.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { safeParse } from "@/lib/mealplan";
import type { Db } from "./types";
import { ACHIEVEMENT_CATALOG, type AchievementDefinition } from "./achievement-catalog";

export type AchievementStatus = "UNLOCKED" | "LOCKED" | "COMING_SOON";

export interface AchievementResult extends AchievementDefinition {
  status: AchievementStatus;
  progress: number | null;
  unlockedAt: Date | null;
}

// ─── Desbloqueio idempotente (mesmo padrão de tryCreateXpEvent) ───────────

export async function unlockAchievement(db: Db, userId: string, code: string) {
  try {
    return await db.userAchievement.create({ data: { userId, achievementCode: code } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return null; // já desbloqueada (idempotência garantida pelo @@unique)
    }
    throw error;
  }
}

// ─── Coleta agrupada de estatísticas reais (uma leva de queries, não 50) ───

interface RawStats {
  onboardingCompleted: boolean;
  profileComplete: boolean;
  dietGoalSet: boolean;
  dietTypeSet: boolean;
  totalMealsCompleted: number;
  breakfastCompleted: number;
  lunchCompleted: number;
  dinnerCompleted: number;
  fullMealDayCount: number;
  weightLogCount: number;
  photoCount: number;
  photoDaySpan: number; // dias entre a foto mais antiga e a mais recente
  betaRedeemedEver: boolean;
  postCount: number;
  friendCount: number;
  groupCount: number;
  reactionsReceived: number;
  commentsReceived: number;
}

interface MealSlot {
  completed?: boolean;
}

function computeMealStats(
  dayPlans: Array<{ breakfast: string | null; lunch: string | null; dinner: string | null; snacks: string | null }>
) {
  let total = 0;
  let breakfast = 0;
  let lunch = 0;
  let dinner = 0;
  let fullDays = 0;

  for (const day of dayPlans) {
    const b = safeParse<MealSlot>(day.breakfast);
    const l = safeParse<MealSlot>(day.lunch);
    const d = safeParse<MealSlot>(day.dinner);
    const snacks = safeParse<MealSlot[]>(day.snacks) ?? [];

    if (b?.completed) {
      total += 1;
      breakfast += 1;
    }
    if (l?.completed) {
      total += 1;
      lunch += 1;
    }
    if (d?.completed) {
      total += 1;
      dinner += 1;
    }
    for (const snack of snacks) {
      if (snack?.completed) total += 1;
    }

    const plannedSlots = [b, l, d, ...snacks].filter((s): s is MealSlot => !!s);
    if (plannedSlots.length > 0 && plannedSlots.every((s) => s.completed === true)) {
      fullDays += 1;
    }
  }

  return { total, breakfast, lunch, dinner, fullDays };
}

async function getRawStats(userId: string): Promise<RawStats> {
  const [
    profile,
    preferences,
    socialProfile,
    weightLogCount,
    photos,
    betaGrantCount,
    postCount,
    friendCount,
    groupCount,
    reactionsReceived,
    commentsReceived,
    dayPlans,
  ] = await Promise.all([
    prisma.profile.findUnique({ where: { userId }, select: { onboardingCompletedAt: true, dietType: true } }),
    prisma.userPreferences.findUnique({ where: { userId }, select: { dietGoal: true } }),
    prisma.socialProfile.findUnique({ where: { userId }, select: { displayName: true, username: true, avatarUrl: true, bio: true } }),
    prisma.weightLog.count({ where: { userId } }),
    prisma.progressPhoto.findMany({ where: { userId }, select: { takenAt: true }, orderBy: { takenAt: "asc" } }),
    prisma.premiumGrant.count({ where: { userId, source: "BETA_CODE" } }),
    prisma.communityPost.count({ where: { authorUserId: userId, deletedAt: null } }),
    prisma.friendship.count({ where: { status: "ACCEPTED", OR: [{ userAId: userId }, { userBId: userId }] } }),
    prisma.groupMember.count({ where: { userId } }),
    prisma.communityReaction.count({ where: { post: { authorUserId: userId }, userId: { not: userId } } }),
    prisma.communityComment.count({ where: { post: { authorUserId: userId }, authorUserId: { not: userId }, deletedAt: null } }),
    prisma.dayPlan.findMany({
      where: { mealPlan: { userId } },
      select: { breakfast: true, lunch: true, dinner: true, snacks: true },
    }),
  ]);

  const mealStats = computeMealStats(dayPlans);

  const profileComplete = Boolean(
    socialProfile?.displayName?.trim() &&
      socialProfile?.username?.trim() &&
      socialProfile?.avatarUrl?.trim() &&
      socialProfile?.bio?.trim()
  );

  let photoDaySpan = 0;
  if (photos.length >= 2) {
    const oldest = photos[0].takenAt.getTime();
    const newest = photos[photos.length - 1].takenAt.getTime();
    photoDaySpan = Math.floor((newest - oldest) / (24 * 60 * 60 * 1000));
  }

  return {
    onboardingCompleted: !!profile?.onboardingCompletedAt,
    profileComplete,
    dietGoalSet: !!preferences?.dietGoal,
    dietTypeSet: !!profile?.dietType,
    totalMealsCompleted: mealStats.total,
    breakfastCompleted: mealStats.breakfast,
    lunchCompleted: mealStats.lunch,
    dinnerCompleted: mealStats.dinner,
    fullMealDayCount: mealStats.fullDays,
    weightLogCount,
    photoCount: photos.length,
    photoDaySpan,
    betaRedeemedEver: betaGrantCount > 0,
    postCount,
    friendCount,
    groupCount,
    reactionsReceived,
    commentsReceived,
  };
}

// ─── Regra de progresso por código (só chamada para códigos AVAILABLE) ────

function computeProgress(code: string, target: number, stats: RawStats): { progress: number; achieved: boolean } {
  const bool = (value: boolean) => ({ progress: value ? 1 : 0, achieved: value });
  const count = (value: number) => ({ progress: Math.min(value, target), achieved: value >= target });

  switch (code) {
    case "WELCOME":
      return bool(stats.onboardingCompleted);
    case "BETA_TESTER":
      return bool(stats.betaRedeemedEver);
    case "PROFILE_COMPLETE":
      return bool(stats.profileComplete);
    case "GOAL_DEFINED":
      return bool(stats.dietGoalSet);
    case "READY_TO_START":
      return bool(stats.onboardingCompleted && stats.dietGoalSet && stats.dietTypeSet);
    case "FIRST_MEAL":
      return count(stats.totalMealsCompleted);
    case "FULL_MEAL_DAY":
      return bool(stats.fullMealDayCount >= 1);
    case "FIRST_BREAKFAST":
      return count(stats.breakfastCompleted);
    case "FIRST_LUNCH":
      return count(stats.lunchCompleted);
    case "FIRST_DINNER":
      return count(stats.dinnerCompleted);
    case "MEALS_10":
    case "MEALS_50":
    case "MEALS_100":
      return count(stats.totalMealsCompleted);
    case "FIRST_WEIGHT_LOG":
    case "WEIGHT_LOGS_10":
    case "WEIGHT_LOGS_25":
      return count(stats.weightLogCount);
    case "FIRST_PROGRESS_PHOTO":
    case "BEFORE_AFTER_READY":
      return count(stats.photoCount);
    case "PROGRESS_30_DAYS":
      return count(stats.photoDaySpan);
    case "FIRST_POST":
      return count(stats.postCount);
    case "FIRST_FRIEND":
      return count(stats.friendCount);
    case "FIRST_GROUP":
      return count(stats.groupCount);
    case "FIRST_REACTION_RECEIVED":
      return count(stats.reactionsReceived);
    case "FIRST_COMMENT_RECEIVED":
      return count(stats.commentsReceived);
    default:
      return { progress: 0, achieved: false };
  }
}

// ─── Reconciliação: avalia, desbloqueia o que faltar, retorna tudo ────────

export async function reconcileAchievements(
  userId: string
): Promise<{ results: AchievementResult[]; newlyUnlocked: string[] }> {
  const [existingRows, stats] = await Promise.all([
    prisma.userAchievement.findMany({ where: { userId }, select: { achievementCode: true, unlockedAt: true } }),
    getRawStats(userId),
  ]);
  const existingByCode = new Map(existingRows.map((row) => [row.achievementCode, row.unlockedAt]));

  const results: AchievementResult[] = [];
  const newlyUnlocked: string[] = [];

  for (const definition of Object.values(ACHIEVEMENT_CATALOG)) {
    if (definition.availability === "COMING_SOON") {
      // Nunca avaliar nem desbloquear enquanto o módulo de dados não existir
      // — mesmo que uma linha antiga exista em UserAchievement (ex.: STREAK_*
      // via motor provisório antigo), o status aqui é sempre COMING_SOON.
      results.push({ ...definition, status: "COMING_SOON", progress: null, unlockedAt: null });
      continue;
    }

    let unlockedAt = existingByCode.get(definition.code) ?? null;

    if (!unlockedAt) {
      const { achieved } = computeProgress(definition.code, definition.target, stats);
      if (achieved) {
        const created = await unlockAchievement(prisma, userId, definition.code);
        if (created) {
          unlockedAt = created.unlockedAt;
          newlyUnlocked.push(definition.code);
        } else {
          // Corrida rara: outra requisição concorrente já criou. Aproximação
          // aceitável só para exibição (a linha real já existe no banco).
          unlockedAt = new Date();
        }
      }
    }

    const { progress } = computeProgress(definition.code, definition.target, stats);

    results.push({
      ...definition,
      status: unlockedAt ? "UNLOCKED" : "LOCKED",
      progress: unlockedAt ? definition.target : progress,
      unlockedAt,
    });
  }

  return { results, newlyUnlocked };
}
