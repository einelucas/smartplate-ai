// lib/hydration/gamification.ts
// Integração de hidratação com o motor de gamificação JÁ existente
// (lib/community/gamification.ts) — nunca um segundo sistema de XP/eventos.
// Regra central: nenhum XP por copo. O único evento é WATER_GOAL_COMPLETED,
// no máximo uma vez por usuário por data local.
import type { Db } from "@/lib/community/types";
import { getLocalWeekRange, toUtcDateOnly } from "@/lib/community/dates";
import { awardXpEvent } from "@/lib/community/gamification";
import { getDailySummary } from "./stats";

/**
 * Reavalia se a meta diária foi atingida num dia específico, a partir do
 * consumo REAL — chamar sempre que um registro de consumo for criado,
 * editado ou excluído (nunca a partir de uma mudança isolada da meta, pra
 * não conceder o evento só por o usuário ter baixado a meta).
 *
 * Idempotência real: `awardXpEvent`/`tryCreateXpEvent` checam a
 * `idempotencyKey` ANTES de inserir e capturam P2002 na corrida — mesma
 * garantia de banco usada por toda a gamificação (meta de atividade, marco
 * de streak, etc.), nunca apenas uma checagem no frontend.
 *
 * `DailyActivity.waterGoalCompleted` reflete o estado ATUAL (pode ser
 * desmarcado se um registro for excluído e o total cair abaixo da meta) —
 * usado para o PROGRESSO das conquistas, que sempre reflete dados reais
 * agora. Isso é independente do XpEvent, que é um ledger imutável e nunca
 * é revertido — uma conquista já desbloqueada nunca é revogada (papel do
 * achievement-engine, que só adiciona, nunca remove UserAchievement).
 */
export async function reevaluateWaterGoalForDay(
  db: Db,
  userId: string,
  timezone: string | null | undefined,
  localDateStr: string
): Promise<void> {
  const summary = await getDailySummary(db, userId, timezone, localDateStr);
  const dateOnly = toUtcDateOnly(localDateStr);

  if (summary.goalCompleted) {
    await db.dailyActivity.upsert({
      where: { userId_date: { userId, date: dateOnly } },
      create: { userId, date: dateOnly, waterGoalCompleted: true },
      update: { waterGoalCompleted: true },
    });

    await awardXpEvent(db, {
      userId,
      eventType: "WATER_GOAL_COMPLETED",
      points: 0,
      idempotencyKey: `water-goal:${userId}:${localDateStr}`,
      referenceType: "WaterLog",
      referenceId: localDateStr,
    });
  } else {
    await db.dailyActivity.updateMany({
      where: { userId, date: dateOnly, waterGoalCompleted: true },
      data: { waterGoalCompleted: false },
    });
  }
}

/**
 * Critério de BALANCED_WEEK (achievement-catalog.ts / checklist seção 50):
 * "em uma mesma semana, cumpra os critérios de alimentação acompanhada,
 * hidratação e atividade física" — interpretado como pelo menos um dia com
 * refeição concluída, um dia com meta de água atingida e um dia com
 * atividade física dentro da MESMA semana local, não necessariamente o
 * mesmo dia (o catálogo não define um número de dias, diferente de
 * BALANCED_ROUTINE_WEEK, que exige os dois primeiros no mesmo dia por 5
 * dias). Documentado explicitamente porque o critério original é vago sobre
 * quantos dias — esta é a leitura mais literal do texto, não uma regra
 * inventada.
 */
export async function hasCompletedBalancedWeek(db: Db, userId: string): Promise<boolean> {
  const rows = await db.dailyActivity.findMany({
    where: {
      userId,
      OR: [{ mealCompleted: true }, { physicalActivityCompleted: true }, { waterGoalCompleted: true }],
    },
    select: { date: true, mealCompleted: true, physicalActivityCompleted: true, waterGoalCompleted: true },
  });

  const weeks = new Map<string, { meal: boolean; activity: boolean; water: boolean }>();
  for (const row of rows) {
    const localDateStr = row.date.toISOString().slice(0, 10);
    const { mondayStr } = getLocalWeekRange(localDateStr);
    const entry = weeks.get(mondayStr) ?? { meal: false, activity: false, water: false };
    if (row.mealCompleted) entry.meal = true;
    if (row.physicalActivityCompleted) entry.activity = true;
    if (row.waterGoalCompleted) entry.water = true;
    weeks.set(mondayStr, entry);
  }

  for (const week of weeks.values()) {
    if (week.meal && week.activity && week.water) return true;
  }
  return false;
}
