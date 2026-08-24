// lib/activity/goals.ts
// Metas semanais de atividade — sempre escolhidas pelo usuário, nunca um
// "ideal" definido pelo sistema (checklist item 18). Progresso é SEMPRE
// recalculado a partir de ActivityLog real (lib/activity/stats.ts), nunca
// persistido/editável (item 21). "Sequência de semanas ativas" aqui é um
// conceito PRÓPRIO, distinto do streak geral do SmartPlate
// (UserGamification.currentStreak, em lib/community/gamification.ts) — nunca
// os dois se misturam, e uma meta não atingida nunca quebra o streak geral.
import { z } from "zod";
import type { ActivityGoalMetric } from "@prisma/client";
import type { Db } from "@/lib/community/types";
import { getLocalDateString } from "@/lib/community/dates";
import { awardXpEvent } from "@/lib/community/gamification";
import { getEligibleActivityLogs, getWeeklyActivityStats, bucketByLocalWeek, listRecentMondayStrings, type PeriodStats } from "./stats";

export const ACTIVITY_GOAL_TARGET_RANGES: Record<ActivityGoalMetric, [number, number]> = {
  ACTIVE_DAYS: [1, 7],
  ACTIVITY_MINUTES: [1, 10000],
  ACTIVITY_COUNT: [1, 100],
};

export const activityGoalMetricSchema = z.enum(["ACTIVE_DAYS", "ACTIVITY_MINUTES", "ACTIVITY_COUNT"]);

export const upsertActivityGoalSchema = z
  .object({
    metric: activityGoalMetricSchema,
    target: z.number().int("Meta deve ser um número inteiro"),
  })
  .refine(
    (data) => {
      const [min, max] = ACTIVITY_GOAL_TARGET_RANGES[data.metric as ActivityGoalMetric];
      return data.target >= min && data.target <= max;
    },
    { message: "Meta fora da faixa permitida", path: ["target"] }
  );

export const updateActivityGoalSchema = z.object({
  target: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

/** Valor atual de uma métrica de meta, a partir das estatísticas reais da semana. */
export function currentValueForMetric(metric: ActivityGoalMetric, weekStats: PeriodStats): number {
  if (metric === "ACTIVE_DAYS") return weekStats.distinctDays;
  if (metric === "ACTIVITY_MINUTES") return weekStats.minutes;
  return weekStats.count; // ACTIVITY_COUNT
}

export interface GoalProgress {
  id: string;
  metric: ActivityGoalMetric;
  target: number;
  current: number;
  /** 0-100, capado em 100 mesmo se `current` ultrapassar `target` (item 22). */
  percentage: number;
}

export function computeGoalProgress(goal: { id: string; metric: ActivityGoalMetric; target: number }, weekStats: PeriodStats): GoalProgress {
  const current = currentValueForMetric(goal.metric, weekStats);
  const percentage = Math.round(Math.min(current / goal.target, 1) * 100);
  return { id: goal.id, metric: goal.metric, target: goal.target, current, percentage };
}

/**
 * Verifica metas ativas do usuário contra a semana atual e registra um
 * evento idempotente na primeira vez que cada meta é atingida naquela semana
 * (item 24: `activity-goal:{goalId}:{semana}`) — nunca celebra duas vezes.
 * Reaproveita XpEvent/awardXpEvent só como ledger idempotente: `points: 0`,
 * então nenhum XP é concedido aqui (item 26) — quem credita XP é o
 * desbloqueio da conquista PERSONAL_GOAL_REACHED, no motor de conquistas.
 */
export async function checkActivityGoalCompletions(db: Db, userId: string, timezone: string | null | undefined): Promise<void> {
  const activeGoals = await db.activityGoal.findMany({ where: { userId, isActive: true } });
  if (activeGoals.length === 0) return;

  const weekStats = await getWeeklyActivityStats(db, userId, timezone);

  for (const goal of activeGoals) {
    if (currentValueForMetric(goal.metric, weekStats) < goal.target) continue;
    await awardXpEvent(db, {
      userId,
      eventType: "ACTIVITY_GOAL_MET",
      points: 0,
      idempotencyKey: `activity-goal:${goal.id}:${weekStats.weekStartStr}`,
      referenceType: "ActivityGoal",
      referenceId: goal.id,
    });
  }
}

// Janela limitada de look-back (nunca todo o histórico) — uma única query,
// bucketada em memória por semana (ver bucketByLocalWeek).
const WEEK_STREAK_LOOKBACK = 26;

export interface ActivityWeekStreak {
  weeks: number;
  /** true = baseada em meta(s) configurada(s); false = fallback "semana com pelo menos 1 atividade" (item 8). */
  basedOnGoals: boolean;
}

/**
 * "Sequência de semanas ativas" — nunca o streak geral do SmartPlate. Com
 * meta(s) ativa(s), uma semana conta quando PELO MENOS UMA meta foi
 * atingida; sem meta, conta qualquer semana com ao menos uma atividade
 * registrada (só para exibição).
 */
export async function getActivityWeekStreak(db: Db, userId: string, timezone: string | null | undefined): Promise<ActivityWeekStreak> {
  const activeGoals = await db.activityGoal.findMany({ where: { userId, isActive: true }, select: { metric: true, target: true } });
  const basedOnGoals = activeGoals.length > 0;

  const todayLocalStr = getLocalDateString(new Date(), timezone);
  const mondayStrings = listRecentMondayStrings(todayLocalStr, WEEK_STREAK_LOOKBACK);
  const oldestMonday = mondayStrings[mondayStrings.length - 1];
  const lookbackStart = new Date(`${oldestMonday}T00:00:00.000Z`);
  lookbackStart.setUTCDate(lookbackStart.getUTCDate() - 2);
  const lookbackEnd = new Date();
  lookbackEnd.setUTCDate(lookbackEnd.getUTCDate() + 2);

  const logs = await getEligibleActivityLogs(db, userId, { gte: lookbackStart, lte: lookbackEnd });
  const weekBuckets = bucketByLocalWeek(logs, timezone);

  let weeks = 0;
  for (const mondayStr of mondayStrings) {
    const stats = weekBuckets.get(mondayStr) ?? { count: 0, minutes: 0, distinctDays: 0 };
    const met = basedOnGoals
      ? activeGoals.some((goal) => currentValueForMetric(goal.metric, stats) >= goal.target)
      : stats.count > 0;
    if (!met) break;
    weeks += 1;
  }

  return { weeks, basedOnGoals };
}
