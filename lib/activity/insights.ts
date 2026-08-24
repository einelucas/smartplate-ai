// lib/activity/insights.ts
// Insights privados de atividade — SEMPRE privados (nunca Comunidade), nunca
// causais, nunca julgamento. Duas camadas: (1) estatísticas determinísticas
// reais (sem IA), sempre disponíveis; (2) 1-3 frases geradas por IA a partir
// SOMENTE de estatísticas agregadas do SmartPlate — nunca dado do Strava,
// peso, fotos, notas, e-mail, username ou qualquer dado médico/privado (ver
// buildAiContext, a única função que monta o payload enviado à IA).
//
// Cache: no máximo 1 geração de IA por usuário por semana, via
// ActivityInsight.dataHash — enquanto os dados agregados não mudarem, o
// mesmo conteúdo é reaproveitado (checklist itens 41-43). Se a IA falhar,
// cai para insights determinísticos — a seção nunca quebra (item 44).
import { createHash } from "crypto";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import type { Db } from "@/lib/community/types";
import { getLocalDateString, getLocalWeekRange, toUtcDateOnly } from "@/lib/community/dates";
import { calculateMealAdherence, safeParse } from "@/lib/mealplan";
import {
  getEligibleActivityLogs,
  getWeeklyActivityStats,
  bucketByLocalWeek,
  listRecentMondayStrings,
  withTimezoneBuffer,
  type PeriodStats,
} from "./stats";
import { computeGoalProgress } from "./goals";

const MOST_ACTIVE_WEEK_LOOKBACK = 12;
const CONSISTENCY_LOOKBACK = 8;

// ─── Estatísticas determinísticas (sem IA) ─────────────────────────────────

export interface MostActiveWeek {
  weekStartStr: string;
  minutes: number;
  count: number;
}

export interface MonthlyEvolution {
  currentMonthKey: string;
  currentMonthMinutes: number;
  currentMonthActivities: number;
  previousMonthKey: string;
  previousMonthMinutes: number;
  previousMonthActivities: number;
  percentChange: number | null;
  /** Sempre true nesta implementação — o mês atual, por definição, ainda não terminou. */
  currentMonthInProgress: boolean;
}

export interface DeterministicActivityStats {
  thisWeek: PeriodStats;
  mostActiveWeek: MostActiveWeek | null;
  consistency: { activeWeeks: number; totalWeeks: number };
  monthlyEvolution: MonthlyEvolution | null;
  mealAdherencePercentage: number | null;
  goals: { metric: string; target: number; current: number }[];
}

async function getWeeklyLookbackBuckets(db: Db, userId: string, timezone: string | null | undefined, weeksBack: number) {
  const todayLocalStr = getLocalDateString(new Date(), timezone);
  const mondayStrings = listRecentMondayStrings(todayLocalStr, weeksBack);
  const oldestMonday = mondayStrings[mondayStrings.length - 1];
  const logs = await getEligibleActivityLogs(db, userId, withTimezoneBuffer(oldestMonday, todayLocalStr));
  return { mondayStrings, buckets: bucketByLocalWeek(logs, timezone) };
}

function findMostActiveWeek(mondayStrings: string[], buckets: Map<string, PeriodStats>): MostActiveWeek | null {
  let best: MostActiveWeek | null = null;
  for (const weekStartStr of mondayStrings) {
    const stats = buckets.get(weekStartStr);
    if (!stats || stats.minutes === 0) continue;
    if (!best || stats.minutes > best.minutes || (stats.minutes === best.minutes && stats.count > best.count)) {
      best = { weekStartStr, minutes: stats.minutes, count: stats.count };
    }
  }
  return best;
}

async function getMonthlyEvolution(db: Db, userId: string, timezone: string | null | undefined): Promise<MonthlyEvolution> {
  const todayLocalStr = getLocalDateString(new Date(), timezone);
  const currentMonthKey = todayLocalStr.slice(0, 7);
  const [year, month] = todayLocalStr.split("-").map(Number);
  const prevMonthDate = new Date(Date.UTC(year, month - 2, 1));
  const previousMonthKey = `${prevMonthDate.getUTCFullYear()}-${String(prevMonthDate.getUTCMonth() + 1).padStart(2, "0")}`;

  const rangeStart = new Date(prevMonthDate);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 2);
  const rangeEnd = new Date();
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 2);

  const logs = await getEligibleActivityLogs(db, userId, { gte: rangeStart, lte: rangeEnd });

  let currentMonthMinutes = 0;
  let currentMonthActivities = 0;
  let previousMonthMinutes = 0;
  let previousMonthActivities = 0;
  for (const log of logs) {
    const key = getLocalDateString(log.performedAt, timezone).slice(0, 7);
    if (key === currentMonthKey) {
      currentMonthMinutes += log.durationMin;
      currentMonthActivities += 1;
    } else if (key === previousMonthKey) {
      previousMonthMinutes += log.durationMin;
      previousMonthActivities += 1;
    }
  }

  const percentChange = previousMonthMinutes > 0 ? Math.round(((currentMonthMinutes - previousMonthMinutes) / previousMonthMinutes) * 100) : null;

  return {
    currentMonthKey,
    currentMonthMinutes,
    currentMonthActivities,
    previousMonthKey,
    previousMonthMinutes,
    previousMonthActivities,
    percentChange,
    currentMonthInProgress: true,
  };
}

/** Reaproveita o cálculo oficial de adesão (lib/mealplan.ts) — nunca outro cálculo em paralelo. */
async function getMealAdherencePercentage(userId: string): Promise<number | null> {
  const latestPlan = await prisma.mealPlan.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { days: { select: { breakfast: true, lunch: true, dinner: true, snacks: true } } },
  });
  if (!latestPlan) return null;

  const days = latestPlan.days.map((day) => ({
    breakfast: safeParse<{ completed?: boolean }>(day.breakfast),
    lunch: safeParse<{ completed?: boolean }>(day.lunch),
    dinner: safeParse<{ completed?: boolean }>(day.dinner),
    snacks: safeParse<{ completed?: boolean }[]>(day.snacks),
  }));
  const { percentage, total } = calculateMealAdherence(days);
  return total > 0 ? percentage : null;
}

export async function getDeterministicActivityStats(db: Db, userId: string, timezone: string | null | undefined): Promise<DeterministicActivityStats> {
  const [thisWeek, lookback, monthlyEvolution, mealAdherencePercentage, goals] = await Promise.all([
    getWeeklyActivityStats(db, userId, timezone),
    getWeeklyLookbackBuckets(db, userId, timezone, MOST_ACTIVE_WEEK_LOOKBACK),
    getMonthlyEvolution(db, userId, timezone),
    getMealAdherencePercentage(userId),
    prisma.activityGoal.findMany({ where: { userId, isActive: true } }),
  ]);

  const consistencyWeeks = lookback.mondayStrings.slice(0, CONSISTENCY_LOOKBACK);
  const activeWeeks = consistencyWeeks.filter((week) => (lookback.buckets.get(week)?.count ?? 0) > 0).length;

  return {
    thisWeek: { count: thisWeek.count, minutes: thisWeek.minutes, distinctDays: thisWeek.distinctDays },
    mostActiveWeek: findMostActiveWeek(lookback.mondayStrings, lookback.buckets),
    consistency: { activeWeeks, totalWeeks: consistencyWeeks.length },
    monthlyEvolution,
    mealAdherencePercentage,
    goals: goals.map((goal) => {
      const progress = computeGoalProgress(goal, thisWeek);
      return { metric: goal.metric, target: goal.target, current: progress.current };
    }),
  };
}

/** Frases descritivas (nunca causais, nunca julgamento) geradas SEM IA — usadas como fallback e também como base de leitura rápida do que a IA recebe. */
export function buildDeterministicInsightLines(stats: DeterministicActivityStats): string[] {
  const lines: string[] = [];

  lines.push(
    `Esta semana você esteve ativo em ${stats.thisWeek.distinctDays} ${stats.thisWeek.distinctDays === 1 ? "dia" : "dias"}, com ${stats.thisWeek.count} ${
      stats.thisWeek.count === 1 ? "atividade" : "atividades"
    } e ${stats.thisWeek.minutes} minutos acumulados.`
  );

  if (stats.mostActiveWeek) {
    lines.push(`Sua semana mais ativa dos últimos ${MOST_ACTIVE_WEEK_LOOKBACK} meses teve ${stats.mostActiveWeek.minutes} minutos de atividade.`);
  }

  if (stats.consistency.activeWeeks > 0) {
    lines.push(`Você registrou atividades em ${stats.consistency.activeWeeks} das últimas ${stats.consistency.totalWeeks} semanas.`);
  }

  if (stats.monthlyEvolution && stats.monthlyEvolution.previousMonthMinutes > 0) {
    const diff = stats.monthlyEvolution.percentChange ?? 0;
    const direction = diff > 0 ? "mais" : diff < 0 ? "menos" : "a mesma quantidade de";
    lines.push(`Até o momento, você registrou ${Math.abs(diff)}% ${direction} minutos de atividade neste mês em relação ao mês anterior.`);
  }

  if (stats.mealAdherencePercentage !== null) {
    lines.push(`Você esteve ativo em ${stats.thisWeek.distinctDays} dias esta semana e completou ${stats.mealAdherencePercentage}% das refeições planejadas.`);
  }

  return lines.slice(0, 3);
}

// ─── Insights com IA (contexto mínimo, cache por semana) ───────────────────

interface AiInsightContext {
  weeklyActivities: number;
  weeklyActiveDays: number;
  weeklyActiveMinutes: number;
  monthlyActivities: number;
  previousMonthActivities: number;
  mealAdherence: number | null;
  goals: { metric: string; target: number; current: number }[];
}

/**
 * Único ponto que monta o payload enviado à IA. Contém SOMENTE estatísticas
 * agregadas — nunca notas de atividade, fotos, peso, birthDate, e-mail,
 * username, dado do Strava ou dado médico/social. Ver checklist itens 36-37.
 */
function buildAiContext(stats: DeterministicActivityStats): AiInsightContext {
  return {
    weeklyActivities: stats.thisWeek.count,
    weeklyActiveDays: stats.thisWeek.distinctDays,
    weeklyActiveMinutes: stats.thisWeek.minutes,
    monthlyActivities: stats.monthlyEvolution?.currentMonthActivities ?? 0,
    previousMonthActivities: stats.monthlyEvolution?.previousMonthActivities ?? 0,
    mealAdherence: stats.mealAdherencePercentage,
    goals: stats.goals,
  };
}

const AI_SYSTEM_PROMPT = `Você é um assistente de bem-estar do SmartPlate. Gere de 1 a 3 insights curtos (uma frase cada) em português brasileiro sobre a rotina de ATIVIDADE FÍSICA do usuário, baseado SOMENTE nos dados agregados fornecidos.

Regras obrigatórias, sem exceção:
- NUNCA dê diagnóstico médico, prescrição, recomendação de tratamento, dieta médica, estimativa exata de gasto calórico ou incentivo a exercício extremo/intenso.
- Tom descritivo, positivo sem exagero, e neutro (nunca de julgamento, como "você treinou pouco" ou "precisa treinar mais") quando o desempenho cair.
- Frases curtas, diretas, sem markdown, sem emojis, uma por linha.
- Nunca invente números que não estejam nos dados fornecidos.
- Nunca faça relação de causa e efeito entre atividade e alimentação — no máximo descreva os dois fatos lado a lado.

Responda APENAS com as frases finais, uma por linha, sem numeração e sem texto adicional.`;

function parseAiInsightLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.replace(/^[-•\d.)\s]+/, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, 3);
}

async function generateAiInsightLines(context: AiInsightContext): Promise<string[] | null> {
  if (!process.env.OPENROUTER_API_KEY) return null;
  try {
    const openai = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: process.env.OPENROUTER_API_KEY });
    const response = await openai.chat.completions.create({
      model: "openai/gpt-3.5-turbo",
      messages: [
        { role: "system", content: AI_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(context) },
      ],
      temperature: 0.6,
      max_tokens: 220,
    });
    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) return null;
    const lines = parseAiInsightLines(raw);
    return lines.length > 0 ? lines : null;
  } catch (error) {
    console.error("Erro ao gerar insights de atividade com IA:", error);
    return null;
  }
}

function computeDataHash(context: AiInsightContext): string {
  return createHash("sha256").update(JSON.stringify(context)).digest("hex");
}

export interface ActivityInsightsResult {
  insights: string[];
  source: "ai" | "deterministic";
  cached: boolean;
}

/**
 * Gera (ou reaproveita do cache semanal) os insights privados de atividade.
 * Nunca chama IA mais de uma vez por semana enquanto os dados agregados não
 * mudarem (dataHash) — e nunca deixa a seção quebrar se a IA falhar.
 */
export async function getActivityInsights(
  userId: string,
  timezone: string | null | undefined,
  stats: DeterministicActivityStats
): Promise<ActivityInsightsResult> {
  const context = buildAiContext(stats);
  const dataHash = computeDataHash(context);

  const todayLocalStr = getLocalDateString(new Date(), timezone);
  const { mondayStr, sundayStr } = getLocalWeekRange(todayLocalStr);
  const periodStart = toUtcDateOnly(mondayStr);
  const periodEnd = toUtcDateOnly(sundayStr);

  const cached = await prisma.activityInsight.findFirst({
    where: { userId, periodStart, periodEnd },
    orderBy: { createdAt: "desc" },
  });

  if (cached && cached.dataHash === dataHash) {
    const content = cached.content as { insights: string[]; source: "ai" | "deterministic" };
    return { insights: content.insights, source: content.source, cached: true };
  }

  const aiLines = await generateAiInsightLines(context);
  const insights = aiLines ?? buildDeterministicInsightLines(stats);
  const source: "ai" | "deterministic" = aiLines ? "ai" : "deterministic";

  await prisma.activityInsight.create({
    data: { userId, periodStart, periodEnd, content: { insights, source }, dataHash },
  });

  return { insights, source, cached: false };
}
