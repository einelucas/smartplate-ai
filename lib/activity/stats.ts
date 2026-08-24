// lib/activity/stats.ts
// Fonte única de verdade para métricas de ActivityLog — Perfil, Início,
// progresso de metas e insights TODOS passam por aqui. Nunca recalcular
// "atividades do mês"/"minutos"/"dias ativos" de outra forma em outro lugar.
//
// Elegibilidade (checklist Parte A, item 1): só ActivityLog `source: MANUAL`
// entra em métricas/metas/conquistas/insights oficiais — atividades
// sincronizadas de provider externo nunca chegam a ActivityLog (ficam em
// ExternalActivityCache, ver lib/integrations/provider-policy.ts), mas o
// filtro abaixo é explícito mesmo assim, por clareza e defesa em profundidade.
import type { Db } from "@/lib/community/types";
import { getLocalDateString, getLocalMonthRange, getLocalWeekRange, toUtcDateOnly } from "@/lib/community/dates";

export interface ActivityLogSample {
  performedAt: Date;
  durationMin: number;
  activityType: string;
}

export interface PeriodStats {
  count: number;
  minutes: number;
  distinctDays: number;
}

export interface MostPracticedType {
  type: string;
  count: number;
}

/** Busca bruta (só os campos necessários) — nunca 1 query por dia/semana; quem chama agrega em memória. */
export async function getEligibleActivityLogs(
  db: Db,
  userId: string,
  range: { gte: Date; lte: Date }
): Promise<ActivityLogSample[]> {
  return db.activityLog.findMany({
    where: { userId, source: "MANUAL", performedAt: range },
    select: { performedAt: true, durationMin: true, activityType: true },
    orderBy: { performedAt: "desc" },
  });
}

export async function getLastEligibleActivity(db: Db, userId: string) {
  return db.activityLog.findFirst({
    where: { userId, source: "MANUAL" },
    orderBy: { performedAt: "desc" },
  });
}

/** Agrega uma lista já buscada dentro de [startLocalStr, endLocalStr] (datas locais, inclusive). */
export function aggregatePeriodStats(
  logs: ActivityLogSample[],
  timezone: string | null | undefined,
  startLocalStr: string,
  endLocalStr: string
): PeriodStats {
  let count = 0;
  let minutes = 0;
  const days = new Set<string>();
  for (const log of logs) {
    const localDateStr = getLocalDateString(log.performedAt, timezone);
    if (localDateStr < startLocalStr || localDateStr > endLocalStr) continue;
    count += 1;
    minutes += log.durationMin;
    days.add(localDateStr);
  }
  return { count, minutes, distinctDays: days.size };
}

/**
 * Tipo mais praticado (checklist item 6): critério estável em caso de
 * empate — 1) quantidade, 2) minutos, 3) atividade mais recente.
 */
export function resolveMostPracticedType(
  logs: ActivityLogSample[],
  timezone: string | null | undefined,
  startLocalStr: string,
  endLocalStr: string
): MostPracticedType | null {
  const byType = new Map<string, { count: number; minutes: number; mostRecentMs: number }>();
  for (const log of logs) {
    const localDateStr = getLocalDateString(log.performedAt, timezone);
    if (localDateStr < startLocalStr || localDateStr > endLocalStr) continue;
    const entry = byType.get(log.activityType) ?? { count: 0, minutes: 0, mostRecentMs: 0 };
    entry.count += 1;
    entry.minutes += log.durationMin;
    entry.mostRecentMs = Math.max(entry.mostRecentMs, log.performedAt.getTime());
    byType.set(log.activityType, entry);
  }

  let best: [string, { count: number; minutes: number; mostRecentMs: number }] | null = null;
  for (const candidate of byType) {
    if (!best) {
      best = candidate;
      continue;
    }
    const [, b] = best;
    const [, c] = candidate;
    if (c.count > b.count) best = candidate;
    else if (c.count === b.count && c.minutes > b.minutes) best = candidate;
    else if (c.count === b.count && c.minutes === b.minutes && c.mostRecentMs > b.mostRecentMs) best = candidate;
  }

  return best ? { type: best[0], count: best[1].count } : null;
}

/** Margem de segurança contra offset de timezone ao converter data local -> instante UTC de busca. */
export function withTimezoneBuffer(startLocalStr: string, endLocalStr: string): { gte: Date; lte: Date } {
  const gte = toUtcDateOnly(startLocalStr);
  gte.setUTCDate(gte.getUTCDate() - 2);
  const lte = toUtcDateOnly(endLocalStr);
  lte.setUTCDate(lte.getUTCDate() + 2);
  return { gte, lte };
}

export interface MonthlyActivityStats extends PeriodStats {
  mostPracticed: MostPracticedType | null;
}

export async function getMonthlyActivityStats(db: Db, userId: string, timezone: string | null | undefined): Promise<MonthlyActivityStats> {
  const todayLocalStr = getLocalDateString(new Date(), timezone);
  const { firstStr, lastStr } = getLocalMonthRange(todayLocalStr);
  const logs = await getEligibleActivityLogs(db, userId, withTimezoneBuffer(firstStr, lastStr));
  return {
    ...aggregatePeriodStats(logs, timezone, firstStr, lastStr),
    mostPracticed: resolveMostPracticedType(logs, timezone, firstStr, lastStr),
  };
}

export interface WeeklyActivityStats extends PeriodStats {
  weekStartStr: string;
  weekEndStr: string;
}

/** `referenceLocalDateStr` permite pedir a semana de uma data específica (default: hoje). */
export async function getWeeklyActivityStats(
  db: Db,
  userId: string,
  timezone: string | null | undefined,
  referenceLocalDateStr?: string
): Promise<WeeklyActivityStats> {
  const referenceStr = referenceLocalDateStr ?? getLocalDateString(new Date(), timezone);
  const { mondayStr, sundayStr } = getLocalWeekRange(referenceStr);
  const logs = await getEligibleActivityLogs(db, userId, withTimezoneBuffer(mondayStr, sundayStr));
  return {
    ...aggregatePeriodStats(logs, timezone, mondayStr, sundayStr),
    weekStartStr: mondayStr,
    weekEndStr: sundayStr,
  };
}

// ─── Agregação multi-semana (streak de atividade / insights) ──────────────

export interface WeekBucketStats extends PeriodStats {
  weekStartStr: string;
}

/** Agrupa uma lista já buscada em baldes por semana local (segunda-feira como chave). */
export function bucketByLocalWeek(logs: ActivityLogSample[], timezone: string | null | undefined): Map<string, PeriodStats> {
  const buckets = new Map<string, { count: number; minutes: number; days: Set<string> }>();
  for (const log of logs) {
    const localDateStr = getLocalDateString(log.performedAt, timezone);
    const { mondayStr } = getLocalWeekRange(localDateStr);
    const bucket = buckets.get(mondayStr) ?? { count: 0, minutes: 0, days: new Set<string>() };
    bucket.count += 1;
    bucket.minutes += log.durationMin;
    bucket.days.add(localDateStr);
    buckets.set(mondayStr, bucket);
  }
  const result = new Map<string, PeriodStats>();
  for (const [week, bucket] of buckets) {
    result.set(week, { count: bucket.count, minutes: bucket.minutes, distinctDays: bucket.days.size });
  }
  return result;
}

/** Lista de segundas-feiras (YYYY-MM-DD), da mais recente pra mais antiga, começando pela semana de `referenceLocalDateStr`. */
export function listRecentMondayStrings(referenceLocalDateStr: string, weeksBack: number): string[] {
  const { mondayStr } = getLocalWeekRange(referenceLocalDateStr);
  const result: string[] = [];
  let cursor = toUtcDateOnly(mondayStr);
  for (let i = 0; i < weeksBack; i++) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor);
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }
  return result;
}
