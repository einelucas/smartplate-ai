// tests/community/notification-triggers.test.ts
// Duas correções reais do checklist seção 26:
//  1. STREAK_* desbloqueada usa a categoria "Sequência" (notifyStreak), não
//     "Progresso" — antes toda conquista, sem exceção, caía em notifyProgress,
//     deixando notifyStreak sem nenhum gatilho real.
//  2. CHALLENGE_COMPLETED agora respeita notifyChallenges — antes ia direto
//     por db.notification.create, ignorando a preferência por completo.
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { reconcileAchievements } from "../../lib/community/achievement-engine";
import { recordChallengeCompletion } from "../../lib/community/gamification";
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

describe("Categoria correta para conquista de streak (notifyStreak, não notifyProgress)", () => {
  it("desbloquear STREAK_7 NÃO notifica quando notifyStreak está desligado, mesmo com notifyProgress ligado", async () => {
    const user = await makeUser();
    await prisma.socialProfile.update({ where: { userId: user.userId }, data: { notifyStreak: false, notifyProgress: true } });
    await prisma.userGamification.create({ data: { userId: user.userId, currentStreak: 7, longestStreak: 7 } });

    await reconcileAchievements(user.userId);

    const notifications = await prisma.notification.findMany({ where: { userId: user.userId, type: "ACHIEVEMENT_UNLOCKED" } });
    assert.equal(notifications.length, 0, "STREAK_7 é categoria Sequência — precisa respeitar notifyStreak, não notifyProgress");
  });

  it("desbloquear STREAK_7 notifica quando notifyStreak está ligado, mesmo com notifyProgress desligado", async () => {
    const user = await makeUser();
    await prisma.socialProfile.update({ where: { userId: user.userId }, data: { notifyStreak: true, notifyProgress: false } });
    // longestStreak=7 desbloqueia STREAK_3 E STREAK_7 juntas — ambas são
    // categoria Sequência, então ambas geram notificação aqui; o teste
    // isola a de STREAK_7 especificamente.
    await prisma.userGamification.create({ data: { userId: user.userId, currentStreak: 7, longestStreak: 7 } });

    await reconcileAchievements(user.userId);

    const notifications = await prisma.notification.findMany({ where: { userId: user.userId, type: "ACHIEVEMENT_UNLOCKED" } });
    const streak7 = notifications.find((n) => (n.data as { achievementCode?: string } | null)?.achievementCode === "STREAK_7");
    assert.ok(streak7, "esperava uma notificação pra STREAK_7");
    assert.equal(streak7!.link, "/profile?achievement=STREAK_7");
  });

  it("uma conquista NÃO-streak (ex.: FIRST_FAVORITE) continua na categoria Progresso, sem afetar notifyStreak", async () => {
    const user = await makeUser();
    await prisma.socialProfile.update({ where: { userId: user.userId }, data: { notifyStreak: false, notifyProgress: true } });
    await prisma.mealPlan.create({ data: { userId: user.userId, dietType: "sem_restricao", calories: 2000, snacks: false, favorite: true } });

    await reconcileAchievements(user.userId);

    const notifications = await prisma.notification.findMany({ where: { userId: user.userId, type: "ACHIEVEMENT_UNLOCKED" } });
    assert.equal(notifications.length, 1, "FIRST_FAVORITE é categoria Alimentação/Progresso — não deveria ser bloqueada por notifyStreak=false");
  });
});

describe("CHALLENGE_COMPLETED respeita notifyChallenges", () => {
  async function makeChallenge(creatorUserId: string, groupId: string | null = null) {
    const challenge = await prisma.challenge.create({
      data: {
        creatorUserId,
        groupId,
        scope: groupId ? "GROUP" : "GLOBAL",
        title: "Desafio de teste",
        metric: "ACTIVE_DAYS",
        target: 5,
        rewardXp: 50,
        startsAt: new Date("2026-01-01T00:00:00.000Z"),
        endsAt: new Date("2026-12-31T00:00:00.000Z"),
      },
    });
    cleanups.push(async () => {
      await prisma.challenge.delete({ where: { id: challenge.id } }).catch(() => {});
    });
    return challenge;
  }

  it("NÃO cria notificação quando o usuário desligou notifyChallenges (antes ignorava essa preferência)", async () => {
    const user = await makeUser();
    await prisma.socialProfile.update({ where: { userId: user.userId }, data: { notifyChallenges: false } });
    const challenge = await makeChallenge(user.userId);

    await recordChallengeCompletion(prisma, user.userId, challenge.id, challenge.rewardXp, challenge.title, challenge.groupId);

    const notifications = await prisma.notification.findMany({ where: { userId: user.userId, type: "CHALLENGE_COMPLETED" } });
    assert.equal(notifications.length, 0);
    // XP e idempotência continuam funcionando independentemente da notificação.
    const events = await prisma.xpEvent.findMany({ where: { userId: user.userId, eventType: "CHALLENGE_COMPLETED" } });
    assert.equal(events.length, 1);
  });

  it("cria notificação com link pra /community quando é desafio GLOBAL", async () => {
    const user = await makeUser();
    const challenge = await makeChallenge(user.userId);

    await recordChallengeCompletion(prisma, user.userId, challenge.id, challenge.rewardXp, challenge.title, challenge.groupId);

    const [notification] = await prisma.notification.findMany({ where: { userId: user.userId, type: "CHALLENGE_COMPLETED" } });
    assert.ok(notification);
    assert.equal(notification.link, "/community");
  });

  it("cria notificação com link pro grupo quando é desafio de GRUPO", async () => {
    const owner = await makeUser();
    const group = await prisma.communityGroup.create({ data: { name: "Grupo desafio", ownerUserId: owner.userId } });
    cleanups.push(async () => {
      await prisma.communityGroup.delete({ where: { id: group.id } }).catch(() => {});
    });
    const user = await makeUser();
    const challenge = await makeChallenge(owner.userId, group.id);

    await recordChallengeCompletion(prisma, user.userId, challenge.id, challenge.rewardXp, challenge.title, challenge.groupId);

    const [notification] = await prisma.notification.findMany({ where: { userId: user.userId, type: "CHALLENGE_COMPLETED" } });
    assert.ok(notification);
    assert.equal(notification.link, `/community/groups/${group.id}`);
  });
});
