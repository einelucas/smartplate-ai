// tests/community/xp-today.test.ts
// getXpEventsToday alimenta o card "XP de hoje" — precisa agrupar por
// eventType, somar múltiplos eventos do mesmo tipo no dia, e nunca incluir
// eventos de outros dias (mesmo padrão de precisão de dia local já usado em
// lib/hydration/stats.ts::getDailySummary).
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { getXpEventsToday } from "../../lib/community/gamification";
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

async function makeXpEvent(userId: string, eventType: string, points: number, createdAt: Date) {
  const event = await prisma.xpEvent.create({
    data: { userId, eventType, points, idempotencyKey: `test-xp:${randomUUID()}`, createdAt },
  });
  cleanups.push(async () => {
    await prisma.xpEvent.delete({ where: { id: event.id } }).catch(() => {});
  });
  return event;
}

describe("getXpEventsToday", () => {
  it("sem nenhum evento hoje retorna lista vazia", async () => {
    const user = await makeUser();
    const result = await getXpEventsToday(user.userId, "UTC");
    assert.deepEqual(result, []);
  });

  it("soma múltiplos eventos do mesmo tipo no mesmo dia (count e points)", async () => {
    const user = await makeUser();
    const now = new Date();
    await makeXpEvent(user.userId, "ACTIVITY_BASE", 5, now);
    await makeXpEvent(user.userId, "ACTIVITY_BASE", 3, now);

    const result = await getXpEventsToday(user.userId, "UTC");
    const entry = result.find((r) => r.eventType === "ACTIVITY_BASE");
    assert.ok(entry);
    assert.equal(entry?.points, 8);
    assert.equal(entry?.count, 2);
  });

  it("nunca inclui eventos de outro dia", async () => {
    const user = await makeUser();
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await makeXpEvent(user.userId, "MEAL_COMPLETED", 10, yesterday);

    const result = await getXpEventsToday(user.userId, "UTC");
    assert.equal(result.find((r) => r.eventType === "MEAL_COMPLETED"), undefined);
  });

  it("usa um rótulo amigável para tipos conhecidos e faz fallback pro próprio eventType em tipos desconhecidos", async () => {
    const user = await makeUser();
    const now = new Date();
    await makeXpEvent(user.userId, "MEAL_COMPLETED", 5, now);
    await makeXpEvent(user.userId, "UM_TIPO_QUE_NAO_EXISTE", 1, now);

    const result = await getXpEventsToday(user.userId, "UTC");
    assert.equal(result.find((r) => r.eventType === "MEAL_COMPLETED")?.label, "Refeição concluída");
    assert.equal(result.find((r) => r.eventType === "UM_TIPO_QUE_NAO_EXISTE")?.label, "UM_TIPO_QUE_NAO_EXISTE");
  });

  it("XP de um usuário nunca aparece no breakdown de outro", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    await makeXpEvent(userA.userId, "STREAK_MILESTONE", 20, new Date());

    const resultB = await getXpEventsToday(userB.userId, "UTC");
    assert.equal(resultB.find((r) => r.eventType === "STREAK_MILESTONE"), undefined);
  });
});
