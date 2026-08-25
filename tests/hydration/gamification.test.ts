// tests/hydration/gamification.test.ts
// Regra central: nenhum XP por copo; WATER_GOAL_COMPLETED no máximo uma vez
// por usuário por data local, garantido no banco (idempotencyKey único +
// P2002), não só na UI. Testes contra o banco real com fixtures isoladas.
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { toUtcDateOnly } from "../../lib/community/dates";
import { reevaluateWaterGoalForDay, hasCompletedBalancedWeek } from "../../lib/hydration/gamification";
import { createTestUser, type TestUser } from "../helpers/fixtures";

const cleanups: (() => Promise<void>)[] = [];
after(async () => {
  for (const cleanup of cleanups) await cleanup();
  await prisma.$disconnect();
});

async function makeUser(): Promise<TestUser> {
  const user = await createTestUser({ timezone: "UTC" });
  cleanups.push(user.cleanup);
  return user;
}

function xpEventsFor(userId: string) {
  return prisma.xpEvent.findMany({ where: { userId, eventType: "WATER_GOAL_COMPLETED" } });
}

describe("reevaluateWaterGoalForDay — idempotência do WATER_GOAL_COMPLETED", () => {
  it("primeira vez que a meta é atingida: cria exatamente 1 evento, com 0 XP, e marca DailyActivity", async () => {
    const user = await makeUser();
    await prisma.waterLog.create({ data: { userId: user.userId, amountMl: 2500, loggedAt: new Date("2026-08-21T12:00:00.000Z") } });

    await reevaluateWaterGoalForDay(prisma, user.userId, "UTC", "2026-08-21");

    const events = await xpEventsFor(user.userId);
    assert.equal(events.length, 1);
    assert.equal(events[0].points, 0); // nunca XP por hidratação — só o gate idempotente

    const daily = await prisma.dailyActivity.findUnique({
      where: { userId_date: { userId: user.userId, date: toUtcDateOnly("2026-08-21") } },
    });
    assert.equal(daily?.waterGoalCompleted, true);
  });

  it("vários copos depois de já ter batido a meta: continua exatamente 1 evento", async () => {
    const user = await makeUser();
    await prisma.waterLog.create({ data: { userId: user.userId, amountMl: 2500, loggedAt: new Date("2026-08-21T12:00:00.000Z") } });
    await reevaluateWaterGoalForDay(prisma, user.userId, "UTC", "2026-08-21");

    await prisma.waterLog.create({ data: { userId: user.userId, amountMl: 500, loggedAt: new Date("2026-08-21T13:00:00.000Z") } });
    await reevaluateWaterGoalForDay(prisma, user.userId, "UTC", "2026-08-21"); // retry / nova chamada
    await reevaluateWaterGoalForDay(prisma, user.userId, "UTC", "2026-08-21"); // retry de novo

    const events = await xpEventsFor(user.userId);
    assert.equal(events.length, 1);
  });

  it("duas chamadas concorrentes (Promise.all) no mesmo dia: nunca cria dois eventos", async () => {
    const user = await makeUser();
    await prisma.waterLog.create({ data: { userId: user.userId, amountMl: 2500, loggedAt: new Date("2026-08-21T12:00:00.000Z") } });

    await Promise.all([
      reevaluateWaterGoalForDay(prisma, user.userId, "UTC", "2026-08-21"),
      reevaluateWaterGoalForDay(prisma, user.userId, "UTC", "2026-08-21"),
    ]);

    const events = await xpEventsFor(user.userId);
    assert.equal(events.length, 1);
  });

  it("apagar o registro (cair abaixo da meta) e recriar não regenera o evento do mesmo dia", async () => {
    const user = await makeUser();
    const log = await prisma.waterLog.create({ data: { userId: user.userId, amountMl: 2500, loggedAt: new Date("2026-08-21T12:00:00.000Z") } });
    await reevaluateWaterGoalForDay(prisma, user.userId, "UTC", "2026-08-21");
    assert.equal((await xpEventsFor(user.userId)).length, 1);

    // Cai abaixo da meta.
    await prisma.waterLog.delete({ where: { id: log.id } });
    await reevaluateWaterGoalForDay(prisma, user.userId, "UTC", "2026-08-21");

    const dailyAfterDelete = await prisma.dailyActivity.findUnique({
      where: { userId_date: { userId: user.userId, date: toUtcDateOnly("2026-08-21") } },
    });
    assert.equal(dailyAfterDelete?.waterGoalCompleted, false);
    // O XpEvent é um ledger imutável — não é revogado só porque o total caiu depois.
    assert.equal((await xpEventsFor(user.userId)).length, 1);

    // Recria o consumo, batendo a meta de novo NO MESMO DIA.
    await prisma.waterLog.create({ data: { userId: user.userId, amountMl: 2500, loggedAt: new Date("2026-08-21T14:00:00.000Z") } });
    await reevaluateWaterGoalForDay(prisma, user.userId, "UTC", "2026-08-21");

    const dailyAfterRecreate = await prisma.dailyActivity.findUnique({
      where: { userId_date: { userId: user.userId, date: toUtcDateOnly("2026-08-21") } },
    });
    assert.equal(dailyAfterRecreate?.waterGoalCompleted, true);
    // Continua exatamente 1 evento — não duplicou.
    assert.equal((await xpEventsFor(user.userId)).length, 1);
  });

  it("um novo dia local permite um novo evento (não é bloqueado pelo dia anterior)", async () => {
    const user = await makeUser();
    await prisma.waterLog.create({ data: { userId: user.userId, amountMl: 2500, loggedAt: new Date("2026-08-21T12:00:00.000Z") } });
    await reevaluateWaterGoalForDay(prisma, user.userId, "UTC", "2026-08-21");

    await prisma.waterLog.create({ data: { userId: user.userId, amountMl: 2500, loggedAt: new Date("2026-08-22T12:00:00.000Z") } });
    await reevaluateWaterGoalForDay(prisma, user.userId, "UTC", "2026-08-22");

    const events = await xpEventsFor(user.userId);
    assert.equal(events.length, 2);
    const dates = events.map((e) => e.referenceId).sort();
    assert.deepEqual(dates, ["2026-08-21", "2026-08-22"]);
  });

  it("meta não atingida: nenhum evento é criado", async () => {
    const user = await makeUser();
    await prisma.waterLog.create({ data: { userId: user.userId, amountMl: 500, loggedAt: new Date("2026-08-21T12:00:00.000Z") } });
    await reevaluateWaterGoalForDay(prisma, user.userId, "UTC", "2026-08-21");

    assert.equal((await xpEventsFor(user.userId)).length, 0);
    const daily = await prisma.dailyActivity.findUnique({
      where: { userId_date: { userId: user.userId, date: toUtcDateOnly("2026-08-21") } },
    });
    assert.equal(daily?.waterGoalCompleted ?? false, false);
  });
});

describe("hasCompletedBalancedWeek (critério de BALANCED_WEEK)", () => {
  it("positivo: refeição, atividade e água em dias distintos da mesma semana", async () => {
    const user = await makeUser();
    await prisma.dailyActivity.createMany({
      data: [
        { userId: user.userId, date: toUtcDateOnly("2026-08-17"), mealCompleted: true },
        { userId: user.userId, date: toUtcDateOnly("2026-08-18"), physicalActivityCompleted: true },
        { userId: user.userId, date: toUtcDateOnly("2026-08-19"), waterGoalCompleted: true },
      ],
    });

    assert.equal(await hasCompletedBalancedWeek(prisma, user.userId), true);
  });

  it("negativo: falta um dos três critérios na semana", async () => {
    const user = await makeUser();
    await prisma.dailyActivity.createMany({
      data: [
        { userId: user.userId, date: toUtcDateOnly("2026-08-17"), mealCompleted: true },
        { userId: user.userId, date: toUtcDateOnly("2026-08-18"), physicalActivityCompleted: true },
        // sem waterGoalCompleted em nenhum dia da semana
      ],
    });

    assert.equal(await hasCompletedBalancedWeek(prisma, user.userId), false);
  });

  it("negativo: os três critérios existem, mas espalhados em semanas diferentes", async () => {
    const user = await makeUser();
    await prisma.dailyActivity.createMany({
      data: [
        { userId: user.userId, date: toUtcDateOnly("2026-08-17"), mealCompleted: true }, // semana de 17/08
        { userId: user.userId, date: toUtcDateOnly("2026-08-24"), physicalActivityCompleted: true }, // semana de 24/08
        { userId: user.userId, date: toUtcDateOnly("2026-08-25"), waterGoalCompleted: true }, // semana de 24/08
      ],
    });

    assert.equal(await hasCompletedBalancedWeek(prisma, user.userId), false);
  });
});
