// tests/community/achievement-engine.test.ts
// Cobertura da migração de achievement-engine.ts (checklist seções 22-23):
//  - STREAK_* agora AVAILABLE, resolvidas contra UserGamification.longestStreak
//    (nunca revogadas por uma sequência quebrada depois).
//  - FIRST_FAVORITE / FIRST_MEAL_SWAP: AVAILABLE, lidas do JSON do DayPlan.
//  - WEIGHT_LOGS_10/25 e BEFORE_AFTER_READY: progresso por DIA distinto, não
//    por linha bruta (WeightLog/ProgressPhoto não têm trava de unicidade por
//    dia — sem essa correção, "registrar várias vezes no mesmo dia" inflava
//    o progresso).
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { reconcileAchievements } from "../../lib/community/achievement-engine";
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

function findResult(results: Awaited<ReturnType<typeof reconcileAchievements>>["results"], code: string) {
  const found = results.find((r) => r.code === code);
  assert.ok(found, `esperava encontrar ${code} nos resultados`);
  return found!;
}

describe("STREAK_* — resolvidas contra longestStreak, nunca revogadas", () => {
  it("longestStreak=10 desbloqueia STREAK_3 e STREAK_7, mas não STREAK_14+ (mostra progresso real)", async () => {
    const user = await makeUser();
    await prisma.userGamification.create({ data: { userId: user.userId, currentStreak: 2, longestStreak: 10 } });

    const { results, newlyUnlocked } = await reconcileAchievements(user.userId);

    assert.ok(newlyUnlocked.includes("STREAK_3"));
    assert.ok(newlyUnlocked.includes("STREAK_7"));
    assert.equal(findResult(results, "STREAK_3").status, "UNLOCKED");
    assert.equal(findResult(results, "STREAK_7").status, "UNLOCKED");
    assert.equal(findResult(results, "STREAK_14").status, "LOCKED");
    assert.equal(findResult(results, "STREAK_14").progress, 10);
    assert.equal(findResult(results, "STREAK_30").progress, 10);
  });

  it("uma sequência quebrada depois (currentStreak cai) não revoga uma STREAK_* já desbloqueada", async () => {
    const user = await makeUser();
    await prisma.userGamification.create({ data: { userId: user.userId, currentStreak: 7, longestStreak: 7 } });
    await reconcileAchievements(user.userId); // desbloqueia STREAK_3/7

    // Sequência quebra — currentStreak cai a 0, mas longestStreak (o recorde) não muda.
    await prisma.userGamification.update({ where: { userId: user.userId }, data: { currentStreak: 0 } });
    const { results, newlyUnlocked } = await reconcileAchievements(user.userId);

    assert.equal(newlyUnlocked.length, 0, "nada novo pra desbloquear na segunda passada");
    assert.equal(findResult(results, "STREAK_7").status, "UNLOCKED");
  });

  it("idempotência: reconciliar duas vezes não gera um segundo evento de XP", async () => {
    const user = await makeUser();
    await prisma.userGamification.create({ data: { userId: user.userId, currentStreak: 3, longestStreak: 3 } });
    await reconcileAchievements(user.userId);
    await reconcileAchievements(user.userId);

    const events = await prisma.xpEvent.findMany({ where: { userId: user.userId, idempotencyKey: `achievement:${user.userId}:STREAK_3` } });
    assert.equal(events.length, 1);
  });
});

describe("FIRST_FAVORITE — Plano Semanal (MealPlan.favorite ou Meal.is_favorite no DayPlan)", () => {
  it("favoritar uma refeição específica (JSON do DayPlan) desbloqueia", async () => {
    const user = await makeUser();
    await prisma.mealPlan.create({
      data: {
        userId: user.userId,
        dietType: "sem_restricao",
        calories: 2000,
        snacks: false,
        days: { create: [{ day: "Monday", breakfast: JSON.stringify({ completed: false, is_favorite: true }) }] },
      },
    });

    const { newlyUnlocked } = await reconcileAchievements(user.userId);
    assert.ok(newlyUnlocked.includes("FIRST_FAVORITE"));
  });

  it("favoritar o plano inteiro (MealPlan.favorite) também desbloqueia", async () => {
    const user = await makeUser();
    await prisma.mealPlan.create({
      data: { userId: user.userId, dietType: "sem_restricao", calories: 2000, snacks: false, favorite: true },
    });

    const { newlyUnlocked } = await reconcileAchievements(user.userId);
    assert.ok(newlyUnlocked.includes("FIRST_FAVORITE"));
  });

  it("favoritar, desfavoritar e favoritar de novo não gera XP duas vezes", async () => {
    const user = await makeUser();
    const plan = await prisma.mealPlan.create({
      data: { userId: user.userId, dietType: "sem_restricao", calories: 2000, snacks: false, favorite: true },
    });
    await reconcileAchievements(user.userId); // desbloqueia

    await prisma.mealPlan.update({ where: { id: plan.id }, data: { favorite: false } });
    await reconcileAchievements(user.userId);
    await prisma.mealPlan.update({ where: { id: plan.id }, data: { favorite: true } });
    const { newlyUnlocked } = await reconcileAchievements(user.userId);

    assert.ok(!newlyUnlocked.includes("FIRST_FAVORITE"), "já estava desbloqueada — não é 'nova' de novo");
    const events = await prisma.xpEvent.findMany({ where: { userId: user.userId, idempotencyKey: `achievement:${user.userId}:FIRST_FAVORITE` } });
    assert.equal(events.length, 1);
  });
});

describe("FIRST_MEAL_SWAP — só a partir do fluxo real de troca (meal.swapped)", () => {
  it("uma refeição com swapped=true desbloqueia", async () => {
    const user = await makeUser();
    await prisma.mealPlan.create({
      data: {
        userId: user.userId,
        dietType: "sem_restricao",
        calories: 2000,
        snacks: false,
        days: { create: [{ day: "Tuesday", lunch: JSON.stringify({ completed: false, swapped: true }) }] },
      },
    });

    const { newlyUnlocked } = await reconcileAchievements(user.userId);
    assert.ok(newlyUnlocked.includes("FIRST_MEAL_SWAP"));
  });

  it("uma edição manual comum (sem swapped) não desbloqueia FIRST_MEAL_SWAP, mesmo já tendo favorito", async () => {
    const user = await makeUser();
    await prisma.mealPlan.create({
      data: {
        userId: user.userId,
        dietType: "sem_restricao",
        calories: 2000,
        snacks: false,
        days: { create: [{ day: "Wednesday", dinner: JSON.stringify({ completed: true, is_favorite: true, rating: 5 }) }] },
      },
    });

    const { results, newlyUnlocked } = await reconcileAchievements(user.userId);
    assert.ok(!newlyUnlocked.includes("FIRST_MEAL_SWAP"));
    assert.equal(findResult(results, "FIRST_MEAL_SWAP").status, "LOCKED");
    assert.equal(findResult(results, "FIRST_FAVORITE").status, "UNLOCKED", "sinal independente do de swap");
  });
});

describe("Anti-abuso: progresso de peso/foto conta DIAS distintos, não linhas", () => {
  it("10 registros de peso no mesmo dia local não desbloqueiam WEIGHT_LOGS_10 (só 1 dia real)", async () => {
    const user = await makeUser();
    await prisma.weightLog.createMany({
      data: Array.from({ length: 10 }, (_, i) => ({
        userId: user.userId,
        weight: 70 + i * 0.1,
        date: new Date(`2026-08-10T0${i}:00:00.000Z`),
      })),
    });

    const { results, newlyUnlocked } = await reconcileAchievements(user.userId);
    assert.ok(!newlyUnlocked.includes("WEIGHT_LOGS_10"), "10 linhas no mesmo dia não valem 10 dias");
    assert.equal(findResult(results, "WEIGHT_LOGS_10").progress, 1);
  });

  it("registros em 2 dias distintos contam progresso 2, não a soma de linhas", async () => {
    const user = await makeUser();
    await prisma.weightLog.createMany({
      data: [
        { userId: user.userId, weight: 70, date: new Date("2026-08-10T08:00:00.000Z") },
        { userId: user.userId, weight: 70.2, date: new Date("2026-08-10T18:00:00.000Z") },
        { userId: user.userId, weight: 69.8, date: new Date("2026-08-11T08:00:00.000Z") },
      ],
    });

    const { results } = await reconcileAchievements(user.userId);
    assert.equal(findResult(results, "WEIGHT_LOGS_10").progress, 2);
  });

  it("2 fotos no mesmo dia não desbloqueiam BEFORE_AFTER_READY (precisa de 2 dias distintos)", async () => {
    const user = await makeUser();
    await prisma.progressPhoto.createMany({
      data: [
        { userId: user.userId, imageUrl: "https://example.invalid/a.jpg", takenAt: new Date("2026-08-10T08:00:00.000Z") },
        { userId: user.userId, imageUrl: "https://example.invalid/b.jpg", takenAt: new Date("2026-08-10T20:00:00.000Z") },
      ],
    });

    const { newlyUnlocked, results } = await reconcileAchievements(user.userId);
    assert.ok(!newlyUnlocked.includes("BEFORE_AFTER_READY"));
    assert.equal(findResult(results, "BEFORE_AFTER_READY").progress, 1);
  });

  it("fotos em 2 dias distintos desbloqueiam BEFORE_AFTER_READY", async () => {
    const user = await makeUser();
    await prisma.progressPhoto.createMany({
      data: [
        { userId: user.userId, imageUrl: "https://example.invalid/a.jpg", takenAt: new Date("2026-08-10T08:00:00.000Z") },
        { userId: user.userId, imageUrl: "https://example.invalid/b.jpg", takenAt: new Date("2026-08-25T08:00:00.000Z") },
      ],
    });

    const { newlyUnlocked } = await reconcileAchievements(user.userId);
    assert.ok(newlyUnlocked.includes("BEFORE_AFTER_READY"));
  });
});
