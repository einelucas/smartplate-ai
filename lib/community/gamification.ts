// lib/community/gamification.ts
// Motor central de gamificação. TODA a lógica de XP/streak/conquistas/
// progresso de desafio vive aqui — nunca espalhar isso pelos componentes ou
// rotas. Idempotência via XpEvent.idempotencyKey é a garantia de que marcar/
// desmarcar repetidamente uma refeição (ou reenviar/editar uma atividade)
// nunca gera XP duplicado.
import { Prisma, type ChallengeMetric } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Db } from "./types";
import { getBlockedUserIds } from "./authz";
import { publicIdentitySelect, resolveAvatarUrl } from "./avatar";
import {
  diffInCalendarDays,
  getLocalDateString,
  getUtcMonthWindow,
  getUtcWeekWindow,
  toUtcDateOnly,
} from "./dates";
import {
  type AchievementCode,
  computeLevel,
  getStreakAchievements,
  getXpAchievements,
} from "./achievements";
import {
  ACTIVITY_MIN_DURATION_FOR_XP,
  ACTIVITY_XP_BASE,
  ACTIVITY_XP_DURATION_BONUS,
  ACTIVITY_XP_DURATION_BONUS_THRESHOLD_MIN,
  ACTIVITY_XP_FIRST_OF_DAY_BONUS,
  ACTIVITY_XP_DAILY_CAP,
} from "@/lib/activity/options";

export const MEAL_COMPLETION_XP = 10;

// XP concedido uma única vez por marco de streak (nunca todo dia — ver
// checklist seção 8, item 38). Chave de idempotência inclui o marco, não a
// "corrida" de streak: se o usuário perder e reconstruir o streak até o
// mesmo número, o XP não é concedido de novo (é um marco de conta, como uma
// conquista, não um bônus recorrente).
export const STREAK_MILESTONE_XP: Record<number, number> = {
  7: 20,
  14: 40,
  30: 75,
  60: 100,
  100: 150,
};

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
  // Checa ANTES de inserir (em vez de só tentar e capturar P2002): dentro de
  // uma transação interativa do Postgres, um erro de constraint capturado
  // ainda deixa a transação "aborted" para qualquer query seguinte na MESMA
  // transação (25P02 "current transaction is aborted") — foi exatamente isso
  // que quebrou o registro de atividade quando a chave de idempotência do
  // dia (ex.: primeira atividade do dia) já existia de um registro apagado
  // antes: o create() seguinte (creditXp) explodia com "transaction is
  // aborted", mascarando o erro real. Checar antes evita gerar esse erro.
  const existing = await db.xpEvent.findUnique({ where: { idempotencyKey: data.idempotencyKey }, select: { id: true } });
  if (existing) return false;

  try {
    await db.xpEvent.create({ data });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return false; // corrida rara: outra requisição criou entre o check e o create
    }
    throw error;
  }
}

/** Credita XP a UserGamification (cria a linha se não existir) e mantém `level` em sincronia. */
async function creditXp(db: Db, userId: string, points: number): Promise<{ totalXp: number }> {
  if (points <= 0) {
    const existing = await db.userGamification.findUnique({ where: { userId } });
    return { totalXp: existing?.totalXp ?? 0 };
  }

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

/**
 * Primitiva pública de concessão de XP idempotente — usada tanto
 * internamente (refeição/atividade/desafio/streak) quanto por
 * achievement-engine.ts para XP de conquista. Nunca fazer
 * `gamification.totalXp += n` diretamente em nenhum lugar do código; sempre
 * passar por aqui (ou pelas funções específicas acima), que sempre passam
 * por XpEvent primeiro.
 */
export async function awardXpEvent(
  db: Db,
  params: { userId: string; eventType: string; points: number; idempotencyKey: string; referenceType?: string; referenceId?: string }
): Promise<boolean> {
  const granted = await tryCreateXpEvent(db, params);
  if (granted && params.points > 0) await creditXp(db, params.userId, params.points);
  return granted;
}

// ─── Conquistas (motor antigo — FIRST_ACTION/STREAK_*/XP_*/FIRST_CHALLENGE/FIRST_GROUP) ─

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
    // Mesmo motivo do check em tryCreateXpEvent acima: capturar P2002 e
    // seguir o loop tentando criar a PRÓXIMA conquista, dentro da mesma
    // transação, deixaria a transação "aborted" pro Postgres. Checa antes.
    const existing = await db.userAchievement.findUnique({
      where: { userId_achievementCode: { userId, achievementCode: code } },
      select: { id: true },
    });
    if (existing) continue;

    try {
      await db.userAchievement.create({ data: { userId, achievementCode: code } });
      newlyUnlocked.push(code);
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      // corrida rara: outra requisição criou entre o check e o create — ignora
    }
  }
  return newlyUnlocked;
}

// ─── Progresso de desafios (sempre calculado no servidor) ──────────────────

type ProgressChange = { mode: "increment"; amount: number } | { mode: "set"; value: number };

// ACTIVE_DAYS/MEAL_COMPLETIONS/STREAK_DAYS continuam com progresso mantido
// por incremento/set em tempo real (dentro de qualifyDayForStreak/
// recordMealCompletion) — o modelo original, intacto. Só as métricas abaixo
// usam o modelo novo (recalculado do zero a cada escrita relevante).

// Métricas de atividade física — sempre RECALCULADAS do zero a partir de
// ActivityLog/DailyActivity a cada escrita relevante (nunca incrementadas),
// porque "dias distintos com X" não é seguro de expressar como um contador
// incremental sem risco de drift. O custo é uma query por desafio ativo do
// usuário nessas métricas — tipicamente zero ou poucos.
const RECOMPUTED_ACTIVITY_METRICS: ChallengeMetric[] = [
  "ACTIVITY_COUNT",
  "ACTIVITY_MINUTES",
  "WALKING_DAYS",
  "RUNNING_DAYS",
  "CYCLING_DAYS",
  "STRENGTH_DAYS",
  "BALANCED_DAYS",
];

const METRIC_TO_ACTIVITY_TYPE: Partial<Record<ChallengeMetric, string>> = {
  WALKING_DAYS: "WALKING",
  RUNNING_DAYS: "RUNNING",
  CYCLING_DAYS: "CYCLING",
  STRENGTH_DAYS: "STRENGTH",
};

function isRecomputedActivityMetric(metric: ChallengeMetric): boolean {
  return RECOMPUTED_ACTIVITY_METRICS.includes(metric);
}

export async function recordChallengeCompletion(
  db: Db,
  userId: string,
  challengeId: string,
  rewardXp: number,
  challengeTitle: string
) {
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

  // Notificação mínima real (integrada ao NotificationsBell) — nunca
  // duplicada, porque esta função inteira só roda uma vez por desafio
  // (gate acima: `if (!created) return`).
  await db.notification.create({
    data: {
      userId,
      type: "CHALLENGE_COMPLETED",
      title: "🏆 Desafio concluído!",
      body: rewardXp > 0 ? `Você completou "${challengeTitle}" e ganhou +${rewardXp} XP.` : `Você completou "${challengeTitle}".`,
      data: { challengeId, rewardXp },
    },
  });
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
      await recordChallengeCompletion(db, userId, participant.challengeId, participant.challenge.rewardXp, participant.challenge.title);
    }
  }
}

/** Valor bruto (não capado) de uma métrica de atividade recalculada, no intervalo [startsAt, endsAt]. */
async function computeActivityMetricValue(
  db: Db,
  userId: string,
  metric: ChallengeMetric,
  startsAt: Date,
  endsAt: Date,
  timezone?: string | null
): Promise<number> {
  if (metric === "ACTIVITY_COUNT") {
    return db.activityLog.count({ where: { userId, performedAt: { gte: startsAt, lte: endsAt } } });
  }
  if (metric === "ACTIVITY_MINUTES") {
    const agg = await db.activityLog.aggregate({
      where: { userId, performedAt: { gte: startsAt, lte: endsAt } },
      _sum: { durationMin: true },
    });
    return agg._sum.durationMin ?? 0;
  }
  if (metric === "BALANCED_DAYS") {
    return db.dailyActivity.count({
      where: { userId, date: { gte: startsAt, lte: endsAt }, mealCompleted: true, physicalActivityCompleted: true },
    });
  }
  const activityType = METRIC_TO_ACTIVITY_TYPE[metric];
  if (!activityType) return 0;
  const rows = await db.activityLog.findMany({
    where: { userId, activityType, performedAt: { gte: startsAt, lte: endsAt } },
    select: { performedAt: true },
  });
  const distinctDays = new Set(rows.map((row) => getLocalDateString(row.performedAt, timezone)));
  return distinctDays.size;
}

/**
 * Recalcula (do zero, nunca incrementa) o progresso de todo desafio ativo
 * cujo `metric` esteja em `metrics` — chamar depois de qualquer escrita que
 * possa afetá-las (novo ActivityLog, refeição concluída para BALANCED_DAYS).
 * Sem participantes elegíveis, não executa nenhuma query extra.
 */
export async function recomputeChallengeProgressForMetrics(db: Db, userId: string, metrics: ChallengeMetric[]) {
  const relevant = metrics.filter(isRecomputedActivityMetric);
  if (relevant.length === 0) return;

  const now = new Date();
  const participants = await db.challengeParticipant.findMany({
    where: {
      userId,
      completedAt: null,
      challenge: { metric: { in: relevant }, startsAt: { lte: now }, endsAt: { gte: now } },
    },
    include: { challenge: true },
  });
  if (participants.length === 0) return;

  const socialProfile = await db.socialProfile.findUnique({ where: { userId }, select: { timezone: true } });

  for (const participant of participants) {
    const { challenge } = participant;
    const windowEnd = now < challenge.endsAt ? now : challenge.endsAt;
    const value = await computeActivityMetricValue(db, userId, challenge.metric, challenge.startsAt, windowEnd, socialProfile?.timezone);
    const cappedProgress = Math.min(value, challenge.target);
    const willComplete = cappedProgress >= challenge.target;

    await db.challengeParticipant.update({
      where: { id: participant.id },
      data: { progress: cappedProgress, ...(willComplete ? { completedAt: now } : {}) },
    });

    if (willComplete) {
      await recordChallengeCompletion(db, userId, challenge.id, challenge.rewardXp, challenge.title);
    }
  }
}

// ─── Dia qualificado para streak (compartilhado entre refeição/atividade) ──
// "Dia qualificado" representa consistência geral no SmartPlate, não uma
// ação específica — por isso este helper é único e reaproveitado por
// qualquer fonte de ação válida, nunca duplicado por tipo de ação.

type QualifyingFlag = "mealCompleted" | "physicalActivityCompleted";

async function qualifyDayForStreak(
  db: Db,
  params: {
    userId: string;
    timezone?: string | null;
    /** Data real da ação (performedAt da atividade, ou "agora" para ações em tempo real como refeição). */
    referenceDate: Date;
    flag: QualifyingFlag;
    xpEarnedDelta: number;
    activityXpEarnedDelta?: number;
  }
): Promise<{ isNewQualifyingDay: boolean; currentStreak?: number }> {
  const { userId, timezone, referenceDate, flag, xpEarnedDelta, activityXpEarnedDelta = 0 } = params;
  const localDateStr = getLocalDateString(referenceDate, timezone);
  const dateOnly = toUtcDateOnly(localDateStr);

  const existing = await db.dailyActivity.findUnique({ where: { userId_date: { userId, date: dateOnly } } });
  const isNewQualifyingDay = !existing;

  if (existing) {
    await db.dailyActivity.update({
      where: { id: existing.id },
      data: {
        qualifyingActions: { increment: 1 },
        xpEarned: { increment: xpEarnedDelta },
        activityXpEarned: { increment: activityXpEarnedDelta },
        qualifiesForStreak: true,
        [flag]: true,
      },
    });
  } else {
    await db.dailyActivity.create({
      data: {
        userId,
        date: dateOnly,
        qualifyingActions: 1,
        xpEarned: xpEarnedDelta,
        activityXpEarned: activityXpEarnedDelta,
        qualifiesForStreak: true,
        [flag]: true,
      },
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

    const milestoneXp = STREAK_MILESTONE_XP[streak];
    if (milestoneXp) {
      const granted = await tryCreateXpEvent(db, {
        userId,
        eventType: "STREAK_MILESTONE",
        points: milestoneXp,
        idempotencyKey: `streak_milestone:${userId}:${streak}`,
        referenceType: "Streak",
        referenceId: String(streak),
      });
      if (granted) await creditXp(db, userId, milestoneXp);
    }

    await updateChallengeProgress(db, userId, "ACTIVE_DAYS", { mode: "increment", amount: 1 });
    await updateChallengeProgress(db, userId, "STREAK_DAYS", { mode: "set", value: streak });
  }

  return { isNewQualifyingDay, currentStreak };
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

  const { isNewQualifyingDay, currentStreak } = await qualifyDayForStreak(db, {
    userId,
    timezone,
    referenceDate: new Date(), // conclusão de refeição é sempre uma ação em tempo real
    flag: "mealCompleted",
    xpEarnedDelta: MEAL_COMPLETION_XP,
  });

  const newlyUnlocked = await checkAndUnlockAchievements(db, userId, {
    isFirstAction: xpEventCountBefore === 0,
    currentStreak,
    totalXp,
  });

  await updateChallengeProgress(db, userId, "MEAL_COMPLETIONS", { mode: "increment", amount: 1 });
  // ACTIVE_DAYS/STREAK_DAYS já são atualizados dentro de qualifyDayForStreak
  // quando isNewQualifyingDay — não duplicar aqui.
  void isNewQualifyingDay;
  // BALANCED_DAYS depende de mealCompleted + physicalActivityCompleted no
  // mesmo dia — só pode mudar aqui se hoje já tinha atividade registrada.
  await recomputeChallengeProgressForMetrics(db, userId, ["BALANCED_DAYS"]);

  return { xpAwarded: true, currentStreak, newlyUnlocked };
}

// ─── Registro de atividade física ──────────────────────────────────────────
// Regras (centralizadas em lib/activity/options.ts): +10 XP base, +5 se
// duração >= 30min, +5 na primeira atividade do dia (idempotente por data
// local), teto de 40 XP/dia vindos de ActivityLog. Nunca reavaliado em
// edição — XP só é calculado uma vez, na criação (ver POST /api/activities).
//
// IMPORTANTE: diferente de refeição (ação sempre em tempo real), atividade
// pode ser retroativa ("Hoje ou uma atividade anterior"). Por isso todo o
// cálculo de dia/streak/teto usa `performedAt`, nunca o instante do POST —
// registrar uma corrida de ontem credita XP/streak a ontem, não a hoje.
//
// Esta função só é chamada para ActivityLog MANUAL (POST /api/activities) —
// atividades de provider externo (Strava etc.) nunca chegam aqui, por
// política central (ver lib/integrations/provider-policy.ts).

export async function recordActivityLog(
  db: Db,
  params: { userId: string; timezone?: string | null; activityId: string; durationMin: number; performedAt: Date }
): Promise<{ xpAwarded: number; currentStreak?: number; newlyUnlocked: AchievementCode[] }> {
  const { userId, timezone, activityId, durationMin, performedAt } = params;

  const xpEventCountBefore = await db.xpEvent.count({ where: { userId } });

  let totalAwarded = 0;
  const localDateStr = getLocalDateString(performedAt, timezone);

  if (durationMin >= ACTIVITY_MIN_DURATION_FOR_XP) {
    const dateOnly = toUtcDateOnly(localDateStr);
    const existingDaily = await db.dailyActivity.findUnique({ where: { userId_date: { userId, date: dateOnly } } });
    let remainingCap = Math.max(0, ACTIVITY_XP_DAILY_CAP - (existingDaily?.activityXpEarned ?? 0));

    const awardedBase = Math.min(ACTIVITY_XP_BASE, remainingCap);
    if (awardedBase > 0) {
      const ok = await tryCreateXpEvent(db, {
        userId,
        eventType: "ACTIVITY_BASE",
        points: awardedBase,
        idempotencyKey: `activity:base:${activityId}`,
        referenceType: "ActivityLog",
        referenceId: activityId,
      });
      if (ok) {
        totalAwarded += awardedBase;
        remainingCap -= awardedBase;
      }
    }

    if (durationMin >= ACTIVITY_XP_DURATION_BONUS_THRESHOLD_MIN) {
      const awardedDuration = Math.min(ACTIVITY_XP_DURATION_BONUS, remainingCap);
      if (awardedDuration > 0) {
        const ok = await tryCreateXpEvent(db, {
          userId,
          eventType: "ACTIVITY_DURATION_BONUS",
          points: awardedDuration,
          idempotencyKey: `activity:duration:${activityId}`,
          referenceType: "ActivityLog",
          referenceId: activityId,
        });
        if (ok) {
          totalAwarded += awardedDuration;
          remainingCap -= awardedDuration;
        }
      }
    }

    const awardedFirstOfDay = Math.min(ACTIVITY_XP_FIRST_OF_DAY_BONUS, remainingCap);
    if (awardedFirstOfDay > 0) {
      const ok = await tryCreateXpEvent(db, {
        userId,
        eventType: "ACTIVITY_FIRST_OF_DAY",
        points: awardedFirstOfDay,
        idempotencyKey: `activity:first:${userId}:${localDateStr}`,
        referenceType: "ActivityLog",
        referenceId: activityId,
      });
      if (ok) totalAwarded += awardedFirstOfDay;
    }
  }

  if (totalAwarded > 0) {
    await creditXp(db, userId, totalAwarded);
  }

  const { currentStreak } = await qualifyDayForStreak(db, {
    userId,
    timezone,
    referenceDate: performedAt,
    flag: "physicalActivityCompleted",
    xpEarnedDelta: totalAwarded,
    activityXpEarnedDelta: totalAwarded,
  });

  const totalXp = (await db.userGamification.findUnique({ where: { userId } }))?.totalXp ?? 0;

  const newlyUnlocked = await checkAndUnlockAchievements(db, userId, {
    isFirstAction: xpEventCountBefore === 0,
    currentStreak,
    totalXp,
  });

  await recomputeChallengeProgressForMetrics(db, userId, [
    "ACTIVITY_COUNT",
    "ACTIVITY_MINUTES",
    "WALKING_DAYS",
    "RUNNING_DAYS",
    "CYCLING_DAYS",
    "STRENGTH_DAYS",
    "BALANCED_DAYS",
  ]);

  return { xpAwarded: totalAwarded, currentStreak, newlyUnlocked };
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
  if (metric === "MEAL_COMPLETIONS") {
    // Aproximação — cada ação qualificante hoje é uma conclusão de refeição
    // (mesma limitação de sempre; não é uma contagem exata de refeições).
    const result = await db.dailyActivity.aggregate({
      where: { userId, date: { gte: startsAt, lte: now } },
      _sum: { qualifyingActions: true },
    });
    return result._sum.qualifyingActions ?? 0;
  }
  if (isRecomputedActivityMetric(metric)) {
    const socialProfile = await db.socialProfile.findUnique({ where: { userId }, select: { timezone: true } });
    return computeActivityMetricValue(db, userId, metric, startsAt, now, socialProfile?.timezone);
  }
  return 0;
}

// ─── Ranking (a partir de XpEvent, nunca de totalXp) ───────────────────────

export type RankingPeriod = "weekly" | "monthly" | "all";
export type RankingScope = "global" | "friends" | "group";

export type RankingEntry = {
  rank: number;
  userId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
};

export type RankingResult = {
  ranking: RankingEntry[];
  /** Posição/XP do próprio usuário, mesmo fora do Top N retornado em `ranking`. `null` se ele não é elegível neste escopo (ex.: showXp=false no escopo global). */
  viewer: { rank: number; xp: number } | null;
};

function getPeriodWindow(period: RankingPeriod): { start?: Date; end?: Date } {
  if (period === "weekly") return getUtcWeekWindow();
  if (period === "monthly") return getUtcMonthWindow();
  return {};
}

export async function getRanking(params: {
  period: RankingPeriod;
  scope: RankingScope;
  groupId?: string;
  viewerUserId: string;
  limit?: number;
}): Promise<RankingResult> {
  const { period, scope, groupId, viewerUserId } = params;
  const limit = params.limit ?? 50;
  const { start, end } = getPeriodWindow(period);

  let eligibleUserIds: string[];

  if (scope === "group") {
    if (!groupId) return { ranking: [], viewer: null };
    const members = await prisma.groupMember.findMany({ where: { groupId }, select: { userId: true } });
    eligibleUserIds = members.map((member) => member.userId);
  } else if (scope === "friends") {
    const friendships = await prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ userAId: viewerUserId }, { userBId: viewerUserId }] },
      select: { userAId: true, userBId: true },
    });
    const friendIds = friendships.map((f) => (f.userAId === viewerUserId ? f.userBId : f.userAId));
    eligibleUserIds = [viewerUserId, ...friendIds];
  } else {
    // global: só perfis descobríveis e com XP público (respeita a
    // preferência de privacidade do próprio usuário), excluindo qualquer
    // usuário bloqueado nos dois sentidos em relação a quem está olhando.
    const [publicProfiles, blockedIds] = await Promise.all([
      prisma.socialProfile.findMany({ where: { isDiscoverable: true, showXp: true }, select: { userId: true } }),
      getBlockedUserIds(prisma, viewerUserId),
    ]);
    eligibleUserIds = publicProfiles.map((profile) => profile.userId).filter((id) => !blockedIds.has(id));
  }

  if (eligibleUserIds.length === 0) return { ranking: [], viewer: null };

  const dateFilter = start && end ? { createdAt: { gte: start, lte: end } } : {};

  const grouped = await prisma.xpEvent.groupBy({
    by: ["userId"],
    where: { userId: { in: eligibleUserIds }, ...dateFilter },
    _sum: { points: true },
    orderBy: { _sum: { points: "desc" } },
  });

  if (grouped.length === 0) return { ranking: [], viewer: null };

  const top = grouped.slice(0, limit);
  const socialProfiles = await prisma.socialProfile.findMany({
    where: { userId: { in: top.map((entry) => entry.userId) } },
    select: publicIdentitySelect,
  });
  const byUserId = new Map(socialProfiles.map((profile) => [profile.userId, profile]));

  const ranking: RankingEntry[] = top.map((entry, index) => {
    const social = byUserId.get(entry.userId);
    return {
      rank: index + 1,
      userId: entry.userId,
      username: social?.username ?? null,
      displayName: social?.displayName ?? "Usuário SmartPlate",
      avatarUrl: social ? resolveAvatarUrl(social) : null,
      xp: entry._sum.points ?? 0,
    };
  });

  const viewerIndex = grouped.findIndex((entry) => entry.userId === viewerUserId);
  const viewer = viewerIndex >= 0 ? { rank: viewerIndex + 1, xp: grouped[viewerIndex]._sum.points ?? 0 } : null;

  return { ranking, viewer };
}

// ─── XP por fonte (Alimentação/Atividade/Sequência/Conquistas/Desafios) ───

const EVENT_TYPE_TO_XP_SOURCE: Record<string, "FOOD" | "ACTIVITY" | "STREAK" | "ACHIEVEMENT" | "CHALLENGE"> = {
  MEAL_COMPLETED: "FOOD",
  ACTIVITY_BASE: "ACTIVITY",
  ACTIVITY_DURATION_BONUS: "ACTIVITY",
  ACTIVITY_FIRST_OF_DAY: "ACTIVITY",
  STREAK_MILESTONE: "STREAK",
  ACHIEVEMENT_UNLOCKED: "ACHIEVEMENT",
  CHALLENGE_COMPLETED: "CHALLENGE",
};

export async function getXpBreakdown(userId: string): Promise<Record<"FOOD" | "ACTIVITY" | "STREAK" | "ACHIEVEMENT" | "CHALLENGE", number>> {
  const grouped = await prisma.xpEvent.groupBy({ by: ["eventType"], where: { userId }, _sum: { points: true } });
  const bySource = { FOOD: 0, ACTIVITY: 0, STREAK: 0, ACHIEVEMENT: 0, CHALLENGE: 0 };
  for (const entry of grouped) {
    const source = EVENT_TYPE_TO_XP_SOURCE[entry.eventType] ?? "ACTIVITY";
    bySource[source] += entry._sum.points ?? 0;
  }
  return bySource;
}
