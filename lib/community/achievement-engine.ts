// lib/community/achievement-engine.ts
// Avaliação e desbloqueio das conquistas do catálogo novo
// (achievement-catalog.ts). Backend é a única autoridade: tudo aqui deriva
// de dados já persistidos, nunca de algo enviado pelo cliente.
//
// Estratégia: reconciliação em tempo de consulta (reconcileAchievements),
// chamada sempre que GET /api/achievements roda. Isso cobre tanto o caso
// "ação real acabou de acontecer" quanto retroatividade para contas antigas
// (seções 55-57 do checklist de conquistas) sem precisar espalhar chamadas
// de avaliação em cada endpoint que toca refeições/peso/fotos/social/
// atividade — a mesma verificação idempotente resolve os dois casos.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { safeParse } from "@/lib/mealplan";
import { getLocalDateString, getLocalWeekRange } from "./dates";
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

// ─── Coleta agrupada de estatísticas reais (uma leva de queries, não dezenas) ─

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
  progressWeeksCount: number; // semanas locais distintas com >= 1 foto
  betaRedeemedEver: boolean;
  postCount: number;
  friendCount: number;
  groupCount: number;
  reactionsReceived: number;
  commentsReceived: number;
  // Atividade física
  activityCount: number;
  activityMinutesTotal: number;
  activityDistinctTypesCount: number;
  activityDistinctDaysTotal: number; // dias locais distintos com atividade, todo o histórico
  activeDaysThisWeekCount: number; // dias locais com atividade na semana local atual
  activityWeeksWith2PlusDaysCount: number; // semanas (histórico limitado) com >=2 dias de atividade
  // Alimentação + atividade
  completeRoutineDaysCount: number; // dias com refeição concluída E atividade
  balancedWeeksCount: number; // semanas com >=5 dias "rotina completa"
  // Desafios
  challengeJoinedCount: number;
  challengeCompletedCount: number;
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

/** Conta quantas chaves de semana (Map<mondayStr, valor>) atingem o limiar informado. */
function countWeeksAtLeast(weekMap: Map<string, number>, threshold: number): number {
  let count = 0;
  for (const value of weekMap.values()) {
    if (value >= threshold) count += 1;
  }
  return count;
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
    activityLogs,
    dailyActivities,
    challengeJoinedCount,
    challengeCompletedCount,
  ] = await Promise.all([
    prisma.profile.findUnique({ where: { userId }, select: { onboardingCompletedAt: true, dietType: true } }),
    prisma.userPreferences.findUnique({ where: { userId }, select: { dietGoal: true } }),
    prisma.socialProfile.findUnique({
      where: { userId },
      select: { displayName: true, username: true, avatarUrl: true, bio: true, timezone: true },
    }),
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
    prisma.activityLog.findMany({ where: { userId }, select: { activityType: true, durationMin: true, performedAt: true } }),
    prisma.dailyActivity.findMany({
      where: { userId },
      select: { date: true, mealCompleted: true, physicalActivityCompleted: true },
    }),
    prisma.challengeParticipant.count({ where: { userId } }),
    prisma.challengeParticipant.count({ where: { userId, completedAt: { not: null } } }),
  ]);

  const timezone = socialProfile?.timezone;
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

  const progressWeeks = new Set<string>();
  for (const photo of photos) {
    const localDate = getLocalDateString(photo.takenAt, timezone);
    progressWeeks.add(getLocalWeekRange(localDate).mondayStr);
  }

  // ── Atividade física ──
  const activityDistinctTypes = new Set<string>();
  let activityMinutesTotal = 0;
  const activityLocalDays = new Set<string>();
  const activityDaysPerWeek = new Map<string, Set<string>>(); // mondayStr -> Set<localDateStr>

  for (const activity of activityLogs) {
    activityDistinctTypes.add(activity.activityType);
    activityMinutesTotal += activity.durationMin;
    const localDate = getLocalDateString(activity.performedAt, timezone);
    activityLocalDays.add(localDate);
    const mondayStr = getLocalWeekRange(localDate).mondayStr;
    if (!activityDaysPerWeek.has(mondayStr)) activityDaysPerWeek.set(mondayStr, new Set());
    activityDaysPerWeek.get(mondayStr)!.add(localDate);
  }

  const activityWeeksDayCount = new Map<string, number>();
  for (const [week, days] of activityDaysPerWeek) activityWeeksDayCount.set(week, days.size);
  const activityWeeksWith2PlusDaysCount = countWeeksAtLeast(activityWeeksDayCount, 2);

  const now = new Date();
  const todayLocalStr = getLocalDateString(now, timezone);
  const { mondayStr: currentMonday, sundayStr: currentSunday } = getLocalWeekRange(todayLocalStr);
  const activeDaysThisWeekCount = [...activityLocalDays].filter((d) => d >= currentMonday && d <= currentSunday).length;

  // ── Alimentação + atividade (via DailyActivity, já bucketado por dia local) ──
  let completeRoutineDaysCount = 0;
  const balancedDaysPerWeek = new Map<string, number>(); // mondayStr -> dias com rotina completa

  for (const daily of dailyActivities) {
    if (daily.mealCompleted && daily.physicalActivityCompleted) {
      completeRoutineDaysCount += 1;
      const localDateStr = daily.date.toISOString().slice(0, 10);
      const mondayStr = getLocalWeekRange(localDateStr).mondayStr;
      balancedDaysPerWeek.set(mondayStr, (balancedDaysPerWeek.get(mondayStr) ?? 0) + 1);
    }
  }
  const balancedWeeksCount = countWeeksAtLeast(balancedDaysPerWeek, 5);

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
    progressWeeksCount: progressWeeks.size,
    betaRedeemedEver: betaGrantCount > 0,
    postCount,
    friendCount,
    groupCount,
    reactionsReceived,
    commentsReceived,
    activityCount: activityLogs.length,
    activityMinutesTotal,
    activityDistinctTypesCount: activityDistinctTypes.size,
    activityDistinctDaysTotal: activityLocalDays.size,
    activeDaysThisWeekCount,
    activityWeeksWith2PlusDaysCount,
    completeRoutineDaysCount,
    balancedWeeksCount,
    challengeJoinedCount,
    challengeCompletedCount,
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
    case "PROGRESS_WEEKS_CONSISTENCY":
      return count(stats.progressWeeksCount);
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
    case "FIRST_ACTIVITY":
    case "ACTIVITIES_10":
    case "ACTIVITIES_50":
    case "ACTIVITIES_100":
      return count(stats.activityCount);
    case "ACTIVE_3_DAYS_WEEK":
      return count(stats.activeDaysThisWeekCount);
    case "ACTIVE_MINUTES_150":
      return count(stats.activityMinutesTotal);
    case "ACTIVITY_EXPLORER":
      return count(stats.activityDistinctTypesCount);
    case "ACTIVITY_WEEKS_CONSISTENCY":
      return count(stats.activityWeeksWith2PlusDaysCount);
    case "ACTIVE_30_DAYS_TOTAL":
      return count(stats.activityDistinctDaysTotal);
    case "COMPLETE_ROUTINE":
      return count(stats.completeRoutineDaysCount);
    case "BALANCED_ROUTINE_WEEK":
      return bool(stats.balancedWeeksCount >= 1);
    case "CONSISTENT_ROUTINE":
      return count(stats.balancedWeeksCount);
    case "FIRST_CHALLENGE_JOINED":
      return count(stats.challengeJoinedCount);
    case "FIRST_CHALLENGE_COMPLETED":
      return count(stats.challengeCompletedCount);
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
