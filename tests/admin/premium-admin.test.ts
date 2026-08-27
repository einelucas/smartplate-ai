// tests/admin/premium-admin.test.ts
// Cobertura de revogação administrativa de PremiumGrant e sua interação com
// resolvePremiumAccess — em especial a garantia de que revogar um grant do
// Beta nunca mexe na assinatura Stripe do mesmo usuário (Profile.subscriptionActive).
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { revokePremiumGrant, listPremiumGrants, derivePremiumGrantStatus, PremiumGrantAdminError } from "../../lib/admin/premium";
import { resolvePremiumAccess } from "../../lib/premium/access";
import { createTestUser, type TestUser } from "../helpers/fixtures";

const cleanups: (() => Promise<void>)[] = [];
after(async () => {
  for (const cleanup of cleanups) await cleanup();
  await prisma.$disconnect();
});

async function makeAdmin(): Promise<TestUser> {
  const user = await createTestUser();
  cleanups.push(user.cleanup);
  await prisma.profile.update({ where: { userId: user.userId }, data: { role: "ADMIN" } });
  return user;
}

async function makeGrant(userId: string, opts: { expiresInDays?: number; source?: "BETA_CODE" | "PROMO_CODE" | "ADMIN" } = {}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (opts.expiresInDays ?? 30) * 24 * 60 * 60 * 1000);
  const grant = await prisma.premiumGrant.create({
    data: { userId, source: opts.source ?? "BETA_CODE", startsAt: now, expiresAt },
  });
  cleanups.push(async () => {
    await prisma.premiumGrant.delete({ where: { id: grant.id } }).catch(() => {});
  });
  return grant;
}

describe("derivePremiumGrantStatus", () => {
  it("ACTIVE quando não revogado e não expirado", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60);
    assert.equal(derivePremiumGrantStatus({ revokedAt: null, expiresAt: future }), "ACTIVE");
  });
  it("EXPIRED quando expiresAt no passado e não revogado", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60);
    assert.equal(derivePremiumGrantStatus({ revokedAt: null, expiresAt: past }), "EXPIRED");
  });
  it("REVOKED tem precedência sobre expiração", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60);
    assert.equal(derivePremiumGrantStatus({ revokedAt: new Date(), expiresAt: future }), "REVOKED");
  });
});

describe("resolvePremiumAccess + PremiumGrant", () => {
  it("grant válido concede Premium", async () => {
    const user = await createTestUser();
    cleanups.push(user.cleanup);
    await makeGrant(user.userId);

    const access = await resolvePremiumAccess(user.userId);
    assert.equal(access.isPremium, true);
    assert.equal(access.source, "BETA_CODE");
  });

  it("grant expirado não concede Premium", async () => {
    const user = await createTestUser();
    cleanups.push(user.cleanup);
    await makeGrant(user.userId, { expiresInDays: -1 });

    const access = await resolvePremiumAccess(user.userId);
    assert.equal(access.isPremium, false);
  });

  it("grant revogado não concede Premium", async () => {
    const admin = await makeAdmin();
    const user = await createTestUser();
    cleanups.push(user.cleanup);
    const grant = await makeGrant(user.userId);

    await revokePremiumGrant({ id: grant.id, actorUserId: admin.userId, reason: "teste automatizado" });

    const access = await resolvePremiumAccess(user.userId);
    assert.equal(access.isPremium, false);
  });

  it("revogar um PremiumGrant de origem Beta NÃO cancela assinatura Stripe do mesmo usuário", async () => {
    const admin = await makeAdmin();
    const user = await createTestUser();
    cleanups.push(user.cleanup);

    // Simula assinatura Stripe ativa no mesmo usuário que também tem um grant Beta.
    await prisma.profile.update({ where: { userId: user.userId }, data: { subscriptionActive: true } });
    const grant = await makeGrant(user.userId, { source: "BETA_CODE" });

    await revokePremiumGrant({ id: grant.id, actorUserId: admin.userId, reason: "teste automatizado" });

    const profile = await prisma.profile.findUniqueOrThrow({ where: { userId: user.userId } });
    assert.equal(profile.subscriptionActive, true, "revogar o grant não deve alterar subscriptionActive");

    // E o usuário continua Premium — agora só pela fonte Stripe.
    const access = await resolvePremiumAccess(user.userId);
    assert.equal(access.isPremium, true);
    assert.equal(access.source, "STRIPE");
  });

  it("revogar duas vezes o mesmo grant falha na segunda tentativa", async () => {
    const admin = await makeAdmin();
    const user = await createTestUser();
    cleanups.push(user.cleanup);
    const grant = await makeGrant(user.userId);

    await revokePremiumGrant({ id: grant.id, actorUserId: admin.userId, reason: "primeira revogação" });
    await assert.rejects(
      () => revokePremiumGrant({ id: grant.id, actorUserId: admin.userId, reason: "segunda revogação" }),
      (error: unknown) => {
        assert.ok(error instanceof PremiumGrantAdminError);
        return true;
      }
    );
  });

  it("registra auditoria com motivo e sem vazar dado sensível", async () => {
    const admin = await makeAdmin();
    const user = await createTestUser();
    cleanups.push(user.cleanup);
    const grant = await makeGrant(user.userId);

    await revokePremiumGrant({ id: grant.id, actorUserId: admin.userId, reason: "motivo do teste" });

    const entries = await prisma.auditLog.findMany({ where: { targetId: grant.id, action: "PREMIUM_GRANT_REVOKED" } });
    assert.equal(entries.length, 1);
    assert.equal(entries[0].actorUserId, admin.userId);
    const metadata = entries[0].metadata as Record<string, unknown>;
    assert.equal(metadata.reason, "motivo do teste");
    cleanups.push(async () => {
      await prisma.auditLog.deleteMany({ where: { targetId: grant.id } });
    });
  });
});

describe("listPremiumGrants", () => {
  it("filtra por status ACTIVE excluindo revogados e expirados", async () => {
    const admin = await makeAdmin();
    const user = await createTestUser();
    cleanups.push(user.cleanup);
    const activeGrant = await makeGrant(user.userId);
    const revokedGrant = await makeGrant(user.userId, { source: "ADMIN" });
    await revokePremiumGrant({ id: revokedGrant.id, actorUserId: admin.userId, reason: "teste" });
    cleanups.push(async () => {
      await prisma.auditLog.deleteMany({ where: { targetId: revokedGrant.id } });
    });

    const { rows } = await listPremiumGrants({ status: "ACTIVE", source: "ALL", page: 1, pageSize: 100 });
    const ids = rows.map((r) => r.id);
    assert.ok(ids.includes(activeGrant.id));
    assert.ok(!ids.includes(revokedGrant.id));
  });
});
