// tests/admin/authz.test.ts
// requireAdmin é a única porta de entrada de autorização do painel admin
// (ver lib/admin/authz.ts) — testado diretamente contra o banco real, como
// já é feito para requireModerator.
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { AuthzError, requireAdmin } from "../../lib/admin/authz";
import { createTestUser, type TestUser } from "../helpers/fixtures";

const cleanups: (() => Promise<void>)[] = [];
after(async () => {
  for (const cleanup of cleanups) await cleanup();
  await prisma.$disconnect();
});

async function makeUser(role: "USER" | "MODERATOR" | "ADMIN" = "USER"): Promise<TestUser> {
  const user = await createTestUser();
  cleanups.push(user.cleanup);
  if (role !== "USER") {
    await prisma.profile.update({ where: { userId: user.userId }, data: { role } });
  }
  return user;
}

describe("requireAdmin", () => {
  it("usuário comum (USER) não passa — lança AuthzError 403", async () => {
    const user = await makeUser("USER");
    await assert.rejects(() => requireAdmin(user.userId), (error: unknown) => {
      assert.ok(error instanceof AuthzError);
      assert.equal((error as AuthzError).status, 403);
      return true;
    });
  });

  it("MODERATOR não é suficiente para o painel admin", async () => {
    const user = await makeUser("MODERATOR");
    await assert.rejects(() => requireAdmin(user.userId));
  });

  it("ADMIN passa e recebe o próprio role de volta", async () => {
    const user = await makeUser("ADMIN");
    const role = await requireAdmin(user.userId);
    assert.equal(role, "ADMIN");
  });

  it("usuário sem Profile (nunca cadastrado) não passa", async () => {
    await assert.rejects(() => requireAdmin("test-nao-existe-" + Date.now()));
  });
});
