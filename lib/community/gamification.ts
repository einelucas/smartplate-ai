// lib/community/gamification.ts
// Motor central de gamificação. TODA a lógica de XP/streak/conquistas/
// progresso de desafio vive aqui — nunca espalhar isso pelos componentes ou
// rotas. Idempotência via XpEvent.idempotencyKey é a garantia de que marcar/
// desmarcar repetidamente uma refeição nunca gera XP duplicado.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Db } from "./types";
import { diffInCalendarDays, getLocalDateString, getUtcWeekWindow, toUtcDateOnly } from "./dates";
import {
  type AchievementCode,
  computeLevel,
  getStreakAchievements,
  getXpAchievements,
} from "./achievements";

export const MEAL_COMPLETION_XP = 10;

// ─── Primitivas ─────────────────────────────────────────────────────────────

async function tryCreateXpEvent(
  db: Db,
  data: {
    userId: string;
    eventType: string;
    points: number;
    idempotencyKey: string;
    referenceType?: string;
    referenceId?: string;
  }
): Promise<boolean> {
  try {
    await db.xpEvent.create({ data });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return false; // idempotência: evento já concedido antes
    }
    throw error;
  }
}

/** Credita XP a UserGamification (cria a linha se não existir) e mantém `level` em sincronia. */
async function creditXp(db: Db, userId: string, points: number): Promise<{ totalXp: number }> {
  const gamification = await db.userGamification.upsert({
    where: { userId },
    create: { userId, totalXp: points, level: computeLevel(points) },
    update: { totalXp: { increment: points } },
  });

  const level = computeLevel(gamification.totalXp);
  if (level !== gamification.level) {
    await db.userGamification.update({ where: { userId }, data: { level } });
  }

  return { totalXp: gamification.totalXp };
}

// ─── Conquistas ─────────────────────────────────────────────────────────────

export async function checkAndUnlockAchievements(
  db: Db,
  userId: string,
  context: {
    isFirstAction?: boolean;
    currentStreak?: number;
    totalXp?: number;
    firstChallengeCompleted?: boolean;
    firstGroupJoined?: boolean;
  }
): Promise<AchievementCode[]> {
  const candidates = new Set<AchievementCode>();
  if (context.isFirstAction) candidates.add("FIRST_ACTION");
  if (context.currentStreak !== undefined) {
    getStreakAchievements(context.currentStreak).forEach((code) => candidates.add(code));
  }
  if (context.totalXp !== undefined) {
    getXpAchievements(context.totalXp).forEach((code) => candidates.add(code));
  }
  if (context.firstChallengeCompleted) candidates.add("FIRST_CHALLENGE");
  if (context.firstGroupJoined) candidates.add("FIRST_GROUP");

  const newlyUnlocked: AchievementCode[] = [];
  for (const code of candidates) {
    try {
      await db.userAchievement.create({ data: { userId, achievementCode: code } });
      newlyUnlocked.push(code);
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      // já desbloqueada — ignora
    }
  }
  return newlyUnlocked;
}

// ─── Progresso de desafios (sempre calculado no servidor) ──────────────────

type ChallengeMetric = "ACTIVE_DAYS" | "MEAL_COMPLETIONS" | "STREAK_DAYS";
type ProgressChange = { mode: "increment"; amount: number } | { mode: "set"; value: number };

export async function recordChallengeCompletion(db: Db, userId: string, challengeId: string, rewardXp: number) {
  const idempotencyKey = `challenge_complete:${challengeId}:${userId}`;
  const created = await tryCreateXpEvent(db, {
    userId,
    eventType: "CHALLENGE_COMPLETED",
    points: rewardXp,
    idempotencyKey,
    referenceType: "Challenge",
    referenceId: challengeId,
  });
  if (!created) return;

  if (rewardXp > 0) await creditXp(db, userId, rewardXp);

  const completedCountBefore = await db.challengeParticipant.count({
    where: { userId, completedAt: { not: null }, challengeId: { not: challengeId } },
  });
  await checkAndUnlockAchievements(db, userId, { firstChallengeCompleted: completedCountBefore === 0 });
}

async function updateChallengeProgress(db: Db, userId: string, metric: ChallengeMetric, change: ProgressChange) {
  const now = new Date();
  const participants = await db.challengeParticipant.findMany({
    where: {
      userId,
      completedAt: null,
      challenge: { metric, startsAt: { lte: now }, endsAt: { gte: now } },
    },
    include: { challenge: true },
  });

  for (const participant of participants) {
    const rawProgress =
      change.mode === "increment" ? participant.progress + change.amount : Math.max(participant.progress, change.value);
    const cappedProgress = Math.min(rawProgress, participant.challenge.target);
    const willComplete = cappedProgress >= participant.challenge.target;

    await db.challengeParticipant.update({
      where: { id: participant.id },
      data: { progress: cappedProgress, ...(willComplete ? { completedAt: now } : {}) },
    });

    if (willComplete) {
      await recordChallengeCompletion(db, userId, participant.challengeId, participant.challenge.rewardXp);
    }
  }
}

// ─── Conclusão de refeição (ponto de integração principal) ────────────────

export async function recordMealCompletion(
  db: Db,
  params: { userId: string; timezone?: string | null; planId: string; mealType: string; snackIndex?: number }
): Promise<{ xpAwarded: boolean; currentStreak?: number; newlyUnlocked: AchievementCode[] }> {
  const { userId, timezone, planId, mealType, snackIndex } = params;
  const localDateStr = getLocalDateString(new Date(), timezone);
  // A data local entra na chave para não colidir entre semanas diferentes de
  // um mesmo DayPlan reutilizado (DayPlan.day é um nome de dia, não uma data).
  const idempotencyKey = `meal_complete:${planId}:${mealType}:${snackIndex ?? 0}:${localDateStr}`;

  const xpEventCountBefore = await db.xpEvent.count({ where: { userId } });

  const created = await tryCreateXpEvent(db, {
    userId,
    eventType: "MEAL_COMPLETED",
    points: MEAL_COMPLETION_XP,
    idempotencyKey,
    referenceType: "MealPlan",
    referenceId: planId,
  });

  if (!created) return { xpAwarded: false, newlyUnlocked: [] };

  const { totalXp } = await creditXp(db, userId, MEAL_COMPLETION_XP);

  const dateOnly = toUtcDateOnly(localDateStr);
  const existingActivity = await db.dailyActivity.findUnique({ where: { userId_date: { userId, date: dateOnly } } });
  const isNewQualifyingDay = !existingActivity;

  if (existingActivity) {
    await db.dailyActivity.update({
      where: { id: existingActivity.id },
      data: { qualifyingActions: { increment: 1 }, xpEarned: { increment: MEAL_COMPLETION_XP } },
    });
  } else {
    await db.dailyActivity.create({
      data: { userId, date: dateOnly, qualifyingActions: 1, xpEarned: MEAL_COMPLETION_XP, qualifiesForStreak: true },
    });
  }

  let currentStreak: number | undefined;

  if (isNewQualifyingDay) {
    const gamification = await db.userGamification.findUniqueOrThrow({ where: { userId } });
    let streak = gamification.currentStreak;
    let longestStreak = gamification.longestStreak;
    let lastQualifiedDate = gamification.lastQualifiedDate;

    if (!lastQualifiedDate) {
      streak = 1;
      lastQualifiedDate = dateOnly;
    } else {
      const diff = diffInCalendarDays(lastQualifiedDate, dateOnly);
      if (diff === 1) {
        streak += 1;
        lastQualifiedDate = dateOnly;
      } else if (diff > 1) {
        streak = 1;
        lastQualifiedDate = dateOnly;
      }
      // diff <= 0: dia já contabilizado ou data retroativa — streak não muda.
    }
    longestStreak = Math.max(longestStreak, streak);

    await db.userGamification.update({
      where: { userId },
      data: { currentStreak: streak, longestStreak, lastQualifiedDate },
    });
    currentStreak = streak;
  }

  const newlyUnlocked = await checkAndUnlockAchievements(db, userId, {
    isFirstAction: xpEventCountBefore === 0,
    currentStreak,
    totalXp,
  });

  await updateChallengeProgress(db, userId, "MEAL_COMPLETIONS", { mode: "increment", amount: 1 });
  if (isNewQualifyingDay) {
    await updateChallengeProgress(db, userId, "ACTIVE_DAYS", { mode: "increment", amount: 1 });
    if (currentStreak !== undefined) {
      await updateChallengeProgress(db, userId, "STREAK_DAYS", { mode: "set", value: currentStreak });
    }
  }

  return { xpAwarded: true, currentStreak, newlyUnlocked };
}

// ─── Entrar em desafio: progresso inicial nunca é aceito do cliente ────────

export async function computeInitialChallengeProgress(
  db: Db,
  userId: string,
  metric: ChallengeMetric,
  startsAt: Date
): Promise<number> {
  const now = new Date();
  if (metric === "STREAK_DAYS") {
    const gamification = await db.userGamification.findUnique({ where: { userId } });
    return gamification?.currentStreak ?? 0;
  }
  if (metric === "ACTIVE_DAYS") {
    return db.dailyActivity.count({ where: { userId, date: { gte: startsAt, lte: now }, qualifiesForStreak: true } });
  }
  // MEAL_COMPLETIONS: soma de qualifyingActions no período (aproximação — cada ação
  // qualificante hoje é uma conclusão de refeição).
  const result = await db.dailyActivity.aggregate({
    where: { userId, date: { gte: startsAt, lte: now } },
    _sum: { qualifyingActions: true },
  });
  return result._sum.qualifyingActions ?? 0;
}

// ─── Ranking semanal (a partir de XpEvent, nunca de totalXp) ──────────────

export type RankingEntry = {
  rank: number;
  userId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  weeklyXp: number;
};

export async function getWeeklyRanking(params: {
  scope: "global" | "group";
  groupId?: string;
  limit?: number;
}): Promise<RankingEntry[]> {
  const { start, end } = getUtcWeekWindow();
  const limit = params.limit ?? 50;

  let userIds: string[] | undefined;
  if (params.scope === "group" && params.groupId) {
    const members = await prisma.groupMember.findMany({ where: { groupId: params.groupId }, select: { userId: true } });
    userIds = members.map((member) => member.userId);
    if (userIds.length === 0) return [];
  }

  const grouped = await prisma.xpEvent.groupBy({
    by: ["userId"],
    where: {
      createdAt: { gte: start, lte: end },
      ...(userIds ? { userId: { in: userIds } } : {}),
    },
    _sum: { points: true },
    orderBy: { _sum: { points: "desc" } },
    take: limit,
  });

  if (grouped.length === 0) return [];

  const socialProfiles = await prisma.socialProfile.findMany({
    where: { userId: { in: grouped.map((g) => g.userId) } },
    select: { userId: true, username: true, displayName: true, avatarUrl: true, showXp: true },
  });
  const byUserId = new Map(socialProfiles.map((profile) => [profile.userId, profile]));

  return grouped.map((entry, index) => {
    const social = byUserId.get(entry.userId);
    return {
      rank: index + 1,
      userId: entry.userId,
      username: social?.username ?? null,
      displayName: social?.displayName ?? "Usuário SmartPlate",
      avatarUrl: social?.avatarUrl ?? null,
      weeklyXp: entry._sum.points ?? 0,
    };
  });
}
