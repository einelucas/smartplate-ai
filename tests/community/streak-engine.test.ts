// tests/community/streak-engine.test.ts
// Cobertura do motor único de streak (qualifyDayForStreak em gamification.ts).
// Usa recordActivityLog (aceita performedAt explícito) em vez de
// recordMealCompletion (sempre "agora") pra poder simular dias diferentes
// sem mockar Date — checklist seção 22 ("validar regras de dia/semana e
// timezone") e seção 31 (testes de streak: continuidade, dia perdido,
// várias ações no mesmo dia, timezone).
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { recordActivityLog } from "../../lib/community/gamification";
import { toUtcDateOnly } from "../../lib/community/dates";
import { createTestUser, type TestUser } from "../helpers/fixtures";

const cleanups: (() => Promise<void>)[] = [];
after(async () => {
  for (const cleanup of cleanups) await cleanup();
  await prisma.$disconnect();
});

async function makeUser(timezone = "UTC"): Promise<TestUser> {
  const user = await createTestUser({ timezone });
  cleanups.push(user.cleanup);
  return user;
}

// durationMin bem acima de ACTIVITY_MIN_DURATION_FOR_XP (10) — garante que
// creditXp roda e cria UserGamification antes de qualifyDayForStreak precisar dela.
function logActivity(userId: string, timezone: string, performedAt: Date) {
  return recordActivityLog(prisma, { userId, timezone, activityId: randomUUID(), durationMin: 30, performedAt });
}

async function getGamification(userId: string) {
  return prisma.userGamification.findUniqueOrThrow({ where: { userId } });
}

describe("qualifyDayForStreak — continuidade e reset", () => {
  it("dois dias seguidos: streak sobe pra 2", async () => {
    const user = await makeUser();
    await logActivity(user.userId, "UTC", new Date("2026-08-10T12:00:00.000Z"));
    await logActivity(user.userId, "UTC", new Date("2026-08-11T12:00:00.000Z"));
    const g = await getGamification(user.userId);
    assert.equal(g.currentStreak, 2);
    assert.equal(g.longestStreak, 2);
  });

  it("dia perdido no meio: streak reinicia em 1, mas longestStreak preserva o recorde anterior", async () => {
    const user = await makeUser();
    await logActivity(user.userId, "UTC", new Date("2026-08-10T12:00:00.000Z"));
    await logActivity(user.userId, "UTC", new Date("2026-08-11T12:00:00.000Z"));
    await logActivity(user.userId, "UTC", new Date("2026-08-12T12:00:00.000Z")); // streak 3
    // pula 2026-08-13 por completo
    await logActivity(user.userId, "UTC", new Date("2026-08-14T12:00:00.000Z"));
    const g = await getGamification(user.userId);
    assert.equal(g.currentStreak, 1, "sequência quebrada reinicia em 1");
    assert.equal(g.longestStreak, 3, "recorde histórico nunca regride");
  });

  it("várias atividades no mesmo dia local: continua contando só 1 dia de streak", async () => {
    const user = await makeUser();
    await logActivity(user.userId, "UTC", new Date("2026-08-10T09:00:00.000Z"));
    await logActivity(user.userId, "UTC", new Date("2026-08-10T15:00:00.000Z"));
    await logActivity(user.userId, "UTC", new Date("2026-08-10T20:00:00.000Z"));

    const g = await getGamification(user.userId);
    assert.equal(g.currentStreak, 1);

    const daily = await prisma.dailyActivity.findUnique({
      where: { userId_date: { userId: user.userId, date: toUtcDateOnly("2026-08-10") } },
    });
    assert.equal(daily?.qualifyingActions, 3, "as 3 ações são registradas...");
    assert.equal(daily?.qualifiesForStreak, true, "...mas continuam qualificando um único dia");
  });

  it("data retroativa anterior ao último dia qualificado não altera o streak atual", async () => {
    const user = await makeUser();
    await logActivity(user.userId, "UTC", new Date("2026-08-14T12:00:00.000Z"));
    await logActivity(user.userId, "UTC", new Date("2026-08-15T12:00:00.000Z")); // streak 2
    // Atividade registrada depois, mas com performedAt de um dia anterior ao streak atual.
    await logActivity(user.userId, "UTC", new Date("2026-08-10T12:00:00.000Z"));

    const g = await getGamification(user.userId);
    assert.equal(g.currentStreak, 2, "retroatividade distante não recalcula o streak pra frente nem pra trás");
  });
});

describe("qualifyDayForStreak — timezone do usuário (nunca UTC do servidor)", () => {
  it("23:30 local (já é o dia seguinte em UTC) qualifica o dia local correto, não o dia UTC", async () => {
    const user = await makeUser("America/Sao_Paulo"); // UTC-3, sem horário de verão
    // 2026-08-10 23:30 em São Paulo == 2026-08-11 02:30 UTC
    await logActivity(user.userId, "America/Sao_Paulo", new Date("2026-08-11T02:30:00.000Z"));

    const daily10 = await prisma.dailyActivity.findUnique({
      where: { userId_date: { userId: user.userId, date: toUtcDateOnly("2026-08-10") } },
    });
    const daily11 = await prisma.dailyActivity.findUnique({
      where: { userId_date: { userId: user.userId, date: toUtcDateOnly("2026-08-11") } },
    });
    assert.ok(daily10, "deveria qualificar 10/08 (dia local do usuário)");
    assert.equal(daily11, null, "não deveria vazar pro dia 11 só por causa do instante UTC");
  });

  it("dois usuários em fusos opostos, mesmo instante UTC: cada um qualifica o SEU dia local", async () => {
    const userTokyo = await makeUser("Asia/Tokyo"); // UTC+9
    const userLA = await makeUser("America/Los_Angeles"); // UTC-7/-8
    const instant = new Date("2026-08-11T01:00:00.000Z"); // 10:00 em Tóquio (dia 11) / ~17-18h do dia anterior em LA (dia 10)

    await recordActivityLog(prisma, { userId: userTokyo.userId, timezone: "Asia/Tokyo", activityId: randomUUID(), durationMin: 30, performedAt: instant });
    await recordActivityLog(prisma, { userId: userLA.userId, timezone: "America/Los_Angeles", activityId: randomUUID(), durationMin: 30, performedAt: instant });

    const tokyoDaily11 = await prisma.dailyActivity.findUnique({
      where: { userId_date: { userId: userTokyo.userId, date: toUtcDateOnly("2026-08-11") } },
    });
    const laDaily10 = await prisma.dailyActivity.findUnique({
      where: { userId_date: { userId: userLA.userId, date: toUtcDateOnly("2026-08-10") } },
    });
    assert.ok(tokyoDaily11, "Tóquio já está em 11/08 nesse instante");
    assert.ok(laDaily10, "Los Angeles ainda está em 10/08 no mesmo instante");
  });
});

describe("qualifyDayForStreak — primeira ação do usuário (sem UserGamification ainda)", () => {
  it("atividade curta (< limite de XP) como primeiríssima ação não derruba a request", async () => {
    const user = await makeUser();
    // durationMin abaixo de ACTIVITY_MIN_DURATION_FOR_XP (10): totalAwarded
    // fica 0, creditXp nunca roda — regressão do bug em que
    // qualifyDayForStreak usava findUniqueOrThrow e explodia aqui.
    const result = await recordActivityLog(prisma, {
      userId: user.userId,
      timezone: "UTC",
      activityId: randomUUID(),
      durationMin: 5,
      performedAt: new Date("2026-08-10T12:00:00.000Z"),
    });
    assert.equal(result.xpAwarded, 0);
    assert.equal(result.currentStreak, 1);
    const g = await getGamification(user.userId);
    assert.equal(g.currentStreak, 1);
  });
});
