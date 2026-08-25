// tests/hydration/stats.test.ts
// Testes de integração contra o banco real (DATABASE_URL do .env) usando
// fixtures isoladas (userId "test-<uuid>", sempre limpas ao final — ver
// tests/helpers/fixtures.ts). Nunca toca contas reais.
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { getDailySummary, getWeeklyHistory } from "../../lib/hydration/stats";
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

describe("getDailySummary", () => {
  it("total real nunca é truncado mesmo acima da meta; remainingMl nunca negativo; progressPercentage limitado a 100", async () => {
    const user = await makeUser();
    await prisma.waterLog.createMany({
      data: [
        { userId: user.userId, amountMl: 2000, loggedAt: new Date("2026-08-21T12:00:00.000Z") },
        { userId: user.userId, amountMl: 1000, loggedAt: new Date("2026-08-21T13:00:00.000Z") },
      ],
    });

    const summary = await getDailySummary(prisma, user.userId, "UTC", "2026-08-21");

    assert.equal(summary.totalMl, 3000); // real, não cortado em 2500 (meta padrão)
    assert.equal(summary.goalMl, 2500);
    assert.equal(summary.remainingMl, 0); // nunca negativo
    assert.equal(summary.progressPercentage, 100); // barra visual limitada a 100
    assert.equal(summary.goalCompleted, true);
    assert.equal(summary.logs.length, 2);
  });

  it("dia sem nenhum registro: total 0, meta completa, sem meta atingida", async () => {
    const user = await makeUser();
    const summary = await getDailySummary(prisma, user.userId, "UTC", "2026-08-21");

    assert.equal(summary.totalMl, 0);
    assert.equal(summary.remainingMl, summary.goalMl);
    assert.equal(summary.progressPercentage, 0);
    assert.equal(summary.goalCompleted, false);
    assert.deepEqual(summary.logs, []);
  });

  it("respeita a meta configurada no perfil, não o fallback de 2500", async () => {
    const user = await makeUser();
    await prisma.profile.update({ where: { userId: user.userId }, data: { dailyWaterGoalMl: 4000 } });
    await prisma.waterLog.create({ data: { userId: user.userId, amountMl: 2000, loggedAt: new Date("2026-08-21T12:00:00.000Z") } });

    const summary = await getDailySummary(prisma, user.userId, "UTC", "2026-08-21");
    assert.equal(summary.goalMl, 4000);
    assert.equal(summary.remainingMl, 2000);
    assert.equal(summary.progressPercentage, 50);
  });

  it("um registro perto da meia-noite fica no dia local correto, não no dia UTC", async () => {
    const user = await makeUser("America/Sao_Paulo");
    // 2026-08-21T02:30:00Z = 2026-08-20T23:30 em America/Sao_Paulo (ainda dia 20 local)
    await prisma.waterLog.create({ data: { userId: user.userId, amountMl: 300, loggedAt: new Date("2026-08-21T02:30:00.000Z") } });

    const summaryDay20 = await getDailySummary(prisma, user.userId, "America/Sao_Paulo", "2026-08-20");
    const summaryDay21 = await getDailySummary(prisma, user.userId, "America/Sao_Paulo", "2026-08-21");

    assert.equal(summaryDay20.totalMl, 300);
    assert.equal(summaryDay21.totalMl, 0);
  });
});

describe("getWeeklyHistory", () => {
  it("sempre retorna 7 entradas (segunda a domingo), mesmo com dias sem registro", async () => {
    const user = await makeUser();
    await prisma.waterLog.createMany({
      data: [
        { userId: user.userId, amountMl: 2500, loggedAt: new Date("2026-08-17T12:00:00.000Z") }, // segunda — bate a meta
        { userId: user.userId, amountMl: 1000, loggedAt: new Date("2026-08-19T12:00:00.000Z") }, // quarta — não bate
      ],
    });

    const days = await getWeeklyHistory(prisma, user.userId, "UTC", "2026-08-21");

    assert.equal(days.length, 7);
    assert.equal(days[0].date, "2026-08-17");
    assert.equal(days[6].date, "2026-08-23");

    const monday = days.find((d) => d.date === "2026-08-17")!;
    assert.equal(monday.totalMl, 2500);
    assert.equal(monday.goalCompleted, true);
    assert.equal(monday.logCount, 1);

    const wednesday = days.find((d) => d.date === "2026-08-19")!;
    assert.equal(wednesday.totalMl, 1000);
    assert.equal(wednesday.goalCompleted, false);

    const tuesday = days.find((d) => d.date === "2026-08-18")!;
    assert.equal(tuesday.totalMl, 0);
    assert.equal(tuesday.logCount, 0);
  });
});
