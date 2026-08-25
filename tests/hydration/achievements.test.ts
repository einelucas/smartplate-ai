// tests/hydration/achievements.test.ts
// Conquistas de hidratação (catálogo novo, achievement-catalog.ts /
// achievement-engine.ts) — critério real conectado a dados reais, nunca
// avaliado a partir de dado inventado.
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { toUtcDateOnly } from "../../lib/community/dates";
import { reconcileAchievements } from "../../lib/community/achievement-engine";
import { createTestUser, type TestUser } from "../helpers/fixtures";

const cleanups: (() => Promise<void>)[] = [];
after(async () => {
  for (const cleanup of cleanups) await cleanup();
  await prisma.$disconnect();
});

async function makeUser(): Promise<TestUser> {
  const user = await createTestUser();
  cleanups.push(user.cleanup);
  return user;
}

function byCode(results: Awaited<ReturnType<typeof reconcileAchievements>>["results"], code: string) {
  const found = results.find((r) => r.code === code);
  assert.ok(found, `conquista ${code} não está no catálogo retornado`);
  return found;
}

describe("conquistas de hidratação — sem nenhum dado", () => {
  it("todas ficam LOCKED com progresso 0 pra um usuário sem registros", async () => {
    const user = await makeUser();
    const { results } = await reconcileAchievements(user.userId);

    for (const code of ["FIRST_WATER_LOG", "FIRST_WATER_GOAL", "WATER_GOAL_3_DAYS", "WATER_GOAL_7_DAYS", "WATER_GOAL_30_DAYS", "WATER_LOGS_50", "WATER_WEEK_CONSISTENCY"]) {
      const entry = byCode(results, code);
      assert.equal(entry.availability, "AVAILABLE"); // não é mais COMING_SOON
      assert.equal(entry.status, "LOCKED");
      assert.equal(entry.progress, 0);
    }

    const balanced = byCode(results, "BALANCED_WEEK");
    assert.equal(balanced.availability, "AVAILABLE");
    assert.equal(balanced.status, "LOCKED");
  });
});

describe("conquistas de hidratação — dados reais desbloqueiam", () => {
  it("FIRST_WATER_LOG desbloqueia com 1 registro; WATER_LOGS_50 continua LOCKED", async () => {
    const user = await makeUser();
    await prisma.waterLog.create({ data: { userId: user.userId, amountMl: 300, loggedAt: new Date("2026-08-21T12:00:00.000Z") } });

    const { results, newlyUnlocked } = await reconcileAchievements(user.userId);

    assert.equal(byCode(results, "FIRST_WATER_LOG").status, "UNLOCKED");
    assert.ok(newlyUnlocked.includes("FIRST_WATER_LOG"));

    const logs50 = byCode(results, "WATER_LOGS_50");
    assert.equal(logs50.status, "LOCKED");
    assert.equal(logs50.progress, 1);
  });

  it("FIRST_WATER_GOAL / WATER_GOAL_3_DAYS desbloqueiam conforme dias com meta batida", async () => {
    const user = await makeUser();
    await prisma.dailyActivity.createMany({
      data: [
        { userId: user.userId, date: toUtcDateOnly("2026-08-17"), waterGoalCompleted: true },
        { userId: user.userId, date: toUtcDateOnly("2026-08-18"), waterGoalCompleted: true },
      ],
    });

    const { results } = await reconcileAchievements(user.userId);

    assert.equal(byCode(results, "FIRST_WATER_GOAL").status, "UNLOCKED"); // target 1
    const goal3 = byCode(results, "WATER_GOAL_3_DAYS");
    assert.equal(goal3.status, "LOCKED"); // target 3, só tem 2
    assert.equal(goal3.progress, 2);
  });

  it("WATER_WEEK_CONSISTENCY conta dias distintos com QUALQUER registro (não exige meta batida)", async () => {
    const user = await makeUser();
    await prisma.waterLog.createMany({
      data: [
        { userId: user.userId, amountMl: 100, loggedAt: new Date("2026-08-17T12:00:00.000Z") },
        { userId: user.userId, amountMl: 100, loggedAt: new Date("2026-08-18T12:00:00.000Z") },
        { userId: user.userId, amountMl: 100, loggedAt: new Date("2026-08-18T18:00:00.000Z") }, // mesmo dia, não conta 2x
      ],
    });

    const { results } = await reconcileAchievements(user.userId);
    const consistency = byCode(results, "WATER_WEEK_CONSISTENCY");
    assert.equal(consistency.progress, 2); // 2 dias distintos, não 3 registros
    assert.equal(consistency.status, "LOCKED"); // target 7
  });

  it("BALANCED_WEEK: positivo com os 3 critérios na mesma semana; negativo faltando um", async () => {
    const userPositive = await makeUser();
    await prisma.dailyActivity.createMany({
      data: [
        { userId: userPositive.userId, date: toUtcDateOnly("2026-08-17"), mealCompleted: true },
        { userId: userPositive.userId, date: toUtcDateOnly("2026-08-18"), physicalActivityCompleted: true },
        { userId: userPositive.userId, date: toUtcDateOnly("2026-08-19"), waterGoalCompleted: true },
      ],
    });
    const positiveResult = await reconcileAchievements(userPositive.userId);
    assert.equal(byCode(positiveResult.results, "BALANCED_WEEK").status, "UNLOCKED");

    const userNegative = await makeUser();
    await prisma.dailyActivity.createMany({
      data: [
        { userId: userNegative.userId, date: toUtcDateOnly("2026-08-17"), mealCompleted: true },
        { userId: userNegative.userId, date: toUtcDateOnly("2026-08-18"), physicalActivityCompleted: true },
        // sem água nesta semana
      ],
    });
    const negativeResult = await reconcileAchievements(userNegative.userId);
    assert.equal(byCode(negativeResult.results, "BALANCED_WEEK").status, "LOCKED");
  });

  it("já desbloqueada não é reavaliada/perdida se o dado real cair depois (UserAchievement nunca é revogada)", async () => {
    const user = await makeUser();
    await prisma.waterLog.create({ data: { userId: user.userId, amountMl: 300, loggedAt: new Date("2026-08-21T12:00:00.000Z") } });
    await reconcileAchievements(user.userId); // desbloqueia FIRST_WATER_LOG

    await prisma.waterLog.deleteMany({ where: { userId: user.userId } }); // remove o único registro

    const { results } = await reconcileAchievements(user.userId);
    assert.equal(byCode(results, "FIRST_WATER_LOG").status, "UNLOCKED"); // continua desbloqueada
  });
});
