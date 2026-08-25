// lib/hydration/stats.ts
// Fonte única de verdade para métricas de hidratação — resumo diário,
// histórico semanal e conquistas passam TODOS por aqui. Nunca recalcular
// total/meta/percentual de outra forma em outra rota/componente.
//
// Semana = segunda a domingo local, mesmo padrão já usado no resto do app
// (lib/activity/stats.ts, ranking semanal) — não um "últimos 7 dias" rolante
// diferente, para não introduzir um segundo conceito de semana.
import type { Db } from "@/lib/community/types";
import { getLocalDateString, getLocalWeekRange, toUtcDateOnly, withTimezoneBuffer } from "@/lib/community/dates";
import { DEFAULT_DAILY_WATER_GOAL_ML } from "./validation";

export interface WaterLogSample {
  id: string;
  amountMl: number;
  loggedAt: Date;
}

/** Busca bruta (só os campos necessários) — nunca 1 query por dia; quem chama agrega em memória. */
export async function getEligibleWaterLogs(db: Db, userId: string, range: { gte: Date; lte: Date }): Promise<WaterLogSample[]> {
  return db.waterLog.findMany({
    where: { userId, loggedAt: range },
    select: { id: true, amountMl: true, loggedAt: true },
    orderBy: { loggedAt: "desc" },
  });
}

export async function getDailyWaterGoalMl(db: Db, userId: string): Promise<number> {
  const profile = await db.profile.findUnique({ where: { userId }, select: { dailyWaterGoalMl: true } });
  return profile?.dailyWaterGoalMl ?? DEFAULT_DAILY_WATER_GOAL_ML;
}

export interface DailyHydrationSummary {
  date: string;
  timezone: string;
  totalMl: number;
  goalMl: number;
  remainingMl: number;
  progressPercentage: number;
  goalCompleted: boolean;
  logs: { id: string; amountMl: number; loggedAt: string }[];
}

/**
 * Resumo diário — total real (nunca cortado, mesmo acima da meta),
 * `remainingMl` nunca negativo, `progressPercentage` limitado a 100 só para
 * a barra visual.
 */
export async function getDailySummary(
  db: Db,
  userId: string,
  timezone: string | null | undefined,
  localDateStr?: string
): Promise<DailyHydrationSummary> {
  const dateStr = localDateStr ?? getLocalDateString(new Date(), timezone);
  const [goalMl, logs] = await Promise.all([
    getDailyWaterGoalMl(db, userId),
    getEligibleWaterLogs(db, userId, withTimezoneBuffer(dateStr, dateStr)),
  ]);

  const dayLogs = logs.filter((log) => getLocalDateString(log.loggedAt, timezone) === dateStr);
  const totalMl = dayLogs.reduce((sum, log) => sum + log.amountMl, 0);
  const remainingMl = Math.max(0, goalMl - totalMl);
  const progressPercentage = goalMl > 0 ? Math.min(100, Math.round((totalMl / goalMl) * 100)) : 0;

  return {
    date: dateStr,
    timezone: timezone || "UTC",
    totalMl,
    goalMl,
    remainingMl,
    progressPercentage,
    goalCompleted: totalMl >= goalMl,
    logs: [...dayLogs]
      .sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime())
      .map((log) => ({ id: log.id, amountMl: log.amountMl, loggedAt: log.loggedAt.toISOString() })),
  };
}

export interface DailyHydrationHistoryEntry {
  date: string;
  totalMl: number;
  goalMl: number;
  goalCompleted: boolean;
  logCount: number;
}

/** Histórico de uma semana local inteira (segunda a domingo), sempre 7 entradas — dias sem registro vêm com totalMl: 0. */
export async function getWeeklyHistory(
  db: Db,
  userId: string,
  timezone: string | null | undefined,
  referenceLocalDateStr?: string
): Promise<DailyHydrationHistoryEntry[]> {
  const refStr = referenceLocalDateStr ?? getLocalDateString(new Date(), timezone);
  const { mondayStr, sundayStr } = getLocalWeekRange(refStr);
  const [goalMl, logs] = await Promise.all([
    getDailyWaterGoalMl(db, userId),
    getEligibleWaterLogs(db, userId, withTimezoneBuffer(mondayStr, sundayStr)),
  ]);

  const byDay = new Map<string, { totalMl: number; logCount: number }>();
  for (const log of logs) {
    const dateStr = getLocalDateString(log.loggedAt, timezone);
    if (dateStr < mondayStr || dateStr > sundayStr) continue;
    const entry = byDay.get(dateStr) ?? { totalMl: 0, logCount: 0 };
    entry.totalMl += log.amountMl;
    entry.logCount += 1;
    byDay.set(dateStr, entry);
  }

  const days: DailyHydrationHistoryEntry[] = [];
  let cursor = toUtcDateOnly(mondayStr);
  for (let i = 0; i < 7; i++) {
    const dateStr = cursor.toISOString().slice(0, 10);
    const entry = byDay.get(dateStr) ?? { totalMl: 0, logCount: 0 };
    days.push({ date: dateStr, totalMl: entry.totalMl, goalMl, goalCompleted: entry.totalMl >= goalMl, logCount: entry.logCount });
    cursor = new Date(cursor);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}
