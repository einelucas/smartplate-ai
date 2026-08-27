// tests/community/notify.test.ts
// notifyIfEnabled é o único ponto de criação de Notification para eventos
// sociais/de progresso — precisa respeitar de verdade a preferência da
// categoria (SocialProfile.notify*), e nunca falhar pra um usuário sem
// SocialProfile ainda (fallback: default true das colunas).
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { notifyIfEnabled } from "../../lib/community/notify";
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

describe("notifyIfEnabled", () => {
  it("cria a notificação quando a categoria está habilitada (default)", async () => {
    const user = await makeUser();
    await notifyIfEnabled(user.userId, "notifySocial", { type: "TEST", title: "t", body: "b" });

    const notifications = await prisma.notification.findMany({ where: { userId: user.userId, type: "TEST" } });
    assert.equal(notifications.length, 1);
  });

  it("NÃO cria a notificação quando a categoria está desabilitada", async () => {
    const user = await makeUser();
    await prisma.socialProfile.update({ where: { userId: user.userId }, data: { notifyChallenges: false } });

    await notifyIfEnabled(user.userId, "notifyChallenges", { type: "TEST_DISABLED", title: "t", body: "b" });

    const notifications = await prisma.notification.findMany({ where: { userId: user.userId, type: "TEST_DISABLED" } });
    assert.equal(notifications.length, 0);
  });

  it("desabilitar uma categoria não afeta outra categoria do mesmo usuário", async () => {
    const user = await makeUser();
    await prisma.socialProfile.update({ where: { userId: user.userId }, data: { notifyChallenges: false } });

    await notifyIfEnabled(user.userId, "notifySocial", { type: "TEST_OTHER_CATEGORY", title: "t", body: "b" });

    const notifications = await prisma.notification.findMany({ where: { userId: user.userId, type: "TEST_OTHER_CATEGORY" } });
    assert.equal(notifications.length, 1);
  });

  it("usuário sem SocialProfile ainda (nunca visitou a Comunidade) recebe a notificação normalmente", async () => {
    const userId = `test-${randomUUID()}`;
    await prisma.profile.create({ data: { userId, email: `${userId}@example.invalid` } });
    cleanups.push(async () => {
      await prisma.profile.delete({ where: { userId } }).catch(() => {});
    });

    await notifyIfEnabled(userId, "notifySocial", { type: "TEST_NO_SOCIAL_PROFILE", title: "t", body: "b" });

    const notifications = await prisma.notification.findMany({ where: { userId, type: "TEST_NO_SOCIAL_PROFILE" } });
    assert.equal(notifications.length, 1);
  });

  it("persiste o link informado (rota relativa pra navegação ao clicar — checklist seção 26/57)", async () => {
    const user = await makeUser();
    await notifyIfEnabled(user.userId, "notifySocial", { type: "TEST_LINK", title: "t", body: "b", link: "/community/groups/abc123" });

    const [notification] = await prisma.notification.findMany({ where: { userId: user.userId, type: "TEST_LINK" } });
    assert.equal(notification?.link, "/community/groups/abc123");
  });

  it("link fica null quando não informado (nunca quebra notificações sem destino específico)", async () => {
    const user = await makeUser();
    await notifyIfEnabled(user.userId, "notifySocial", { type: "TEST_NO_LINK", title: "t", body: "b" });

    const [notification] = await prisma.notification.findMany({ where: { userId: user.userId, type: "TEST_NO_LINK" } });
    assert.equal(notification?.link, null);
  });
});
