// tests/community/mutes.test.ts
// getMutedUserIds/getMutedPostTypes alimentam a exclusão no feed
// (app/api/community/feed/route.ts) — nunca bidirecional (diferente de
// getBlockedUserIds): silenciar só afeta quem silenciou.
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { getMutedUserIds, getMutedPostTypes } from "../../lib/community/authz";
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

describe("getMutedUserIds", () => {
  it("retorna vazio quando ninguém foi silenciado", async () => {
    const user = await makeUser();
    const result = await getMutedUserIds(prisma, user.userId);
    assert.equal(result.size, 0);
  });

  it("retorna o usuário silenciado, mas não afeta o outro lado (unidirecional)", async () => {
    const muter = await makeUser();
    const muted = await makeUser();
    const mute = await prisma.userFeedMute.create({ data: { muterUserId: muter.userId, mutedUserId: muted.userId } });
    cleanups.push(async () => {
      await prisma.userFeedMute.delete({ where: { id: mute.id } }).catch(() => {});
    });

    const fromMuter = await getMutedUserIds(prisma, muter.userId);
    assert.ok(fromMuter.has(muted.userId));

    const fromMuted = await getMutedUserIds(prisma, muted.userId);
    assert.equal(fromMuted.has(muter.userId), false, "silenciar não é bidirecional");
  });
});

describe("getMutedPostTypes", () => {
  it("retorna vazio sem nenhum tipo silenciado", async () => {
    const user = await makeUser();
    const result = await getMutedPostTypes(prisma, user.userId);
    assert.equal(result.size, 0);
  });

  it("retorna os tipos silenciados por este usuário", async () => {
    const user = await makeUser();
    const mute = await prisma.userContentMute.create({ data: { userId: user.userId, postType: "ACHIEVEMENT" } });
    cleanups.push(async () => {
      await prisma.userContentMute.delete({ where: { id: mute.id } }).catch(() => {});
    });

    const result = await getMutedPostTypes(prisma, user.userId);
    assert.ok(result.has("ACHIEVEMENT"));
    assert.equal(result.has("PLAN_SHARE"), false);
  });
});
