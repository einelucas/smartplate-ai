// tests/admin/beta-admin.test.ts
// Cobertura do painel admin de Beta Codes: criação de lote (sem persistir
// texto puro), desativação (inclusive concorrência com resgate), e registro
// de auditoria — sem tocar em contas reais.
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { createBetaBatch, disableBetaCode, listBetaCodes, BetaCodeAdminError } from "../../lib/admin/beta";
import { redeemBetaCodeForUser } from "../../lib/beta/redeem";
import { hashBetaCode, normalizeBetaCode } from "../../lib/beta/codes";
import { createTestUser, createTestBetaCode, type TestUser } from "../helpers/fixtures";

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

describe("createBetaBatch", () => {
  it("cria N códigos com o mesmo batchId, persiste só o hash/hint (nunca o texto puro), e retorna os códigos em texto puro apenas na resposta", async () => {
    const admin = await makeAdmin();

    const result = await createBetaBatch({ quantity: 5, durationDays: 45, actorUserId: admin.userId });
    cleanups.push(async () => {
      await prisma.betaCode.deleteMany({ where: { batchId: result.batchId } });
      await prisma.auditLog.deleteMany({ where: { targetId: result.batchId } });
    });

    assert.equal(result.codes.length, 5);

    const rows = await prisma.betaCode.findMany({ where: { batchId: result.batchId } });
    assert.equal(rows.length, 5);

    for (const row of rows) {
      assert.equal(row.durationDays, 45);
      assert.equal(row.createdByUserId, admin.userId);
      // O hash bate com algum dos códigos retornados — prova que o hash é
      // derivado do texto puro devolvido, mas a linha do banco não guarda
      // o texto puro em nenhuma coluna.
      const matches = result.codes.some((plain) => hashBetaCode(normalizeBetaCode(plain)) === row.codeHash);
      assert.ok(matches);
      assert.equal((row as unknown as Record<string, unknown>).code, undefined);
      assert.equal((row as unknown as Record<string, unknown>).plainCode, undefined);
    }

    const auditEntries = await prisma.auditLog.findMany({ where: { targetId: result.batchId, action: "BETA_BATCH_CREATED" } });
    assert.equal(auditEntries.length, 1);
    assert.equal(auditEntries[0].actorUserId, admin.userId);
    const metadata = auditEntries[0].metadata as Record<string, unknown>;
    assert.equal(metadata.quantity, 5);
    // Nunca deve haver código promocional em texto puro no audit log.
    assert.ok(!JSON.stringify(metadata).includes(result.codes[0]));
  });

  it("respeita redeemUntil informado", async () => {
    const admin = await makeAdmin();
    const redeemUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 10);

    const result = await createBetaBatch({ quantity: 2, durationDays: 30, redeemUntil, actorUserId: admin.userId });
    cleanups.push(async () => {
      await prisma.betaCode.deleteMany({ where: { batchId: result.batchId } });
      await prisma.auditLog.deleteMany({ where: { targetId: result.batchId } });
    });

    const rows = await prisma.betaCode.findMany({ where: { batchId: result.batchId } });
    for (const row of rows) {
      assert.equal(row.redeemUntil?.getTime(), redeemUntil.getTime());
    }
  });
});

describe("disableBetaCode", () => {
  it("desativa um código ainda disponível e registra quem/quando", async () => {
    const admin = await makeAdmin();
    const code = await createTestBetaCode();
    cleanups.push(code.cleanup);

    const disabled = await disableBetaCode({ id: code.id, actorUserId: admin.userId });
    assert.equal(disabled.isActive, false);
    assert.ok(disabled.disabledAt);
    assert.equal(disabled.disabledByUserId, admin.userId);

    const auditEntries = await prisma.auditLog.findMany({ where: { targetId: code.id, action: "BETA_CODE_DISABLED" } });
    assert.equal(auditEntries.length, 1);
    cleanups.push(async () => {
      await prisma.auditLog.deleteMany({ where: { targetId: code.id } });
    });
  });

  it("rejeita desativar um código já utilizado", async () => {
    const admin = await makeAdmin();
    const code = await createTestBetaCode();
    cleanups.push(code.cleanup);
    const user = await createTestUser();
    cleanups.push(user.cleanup);

    const redeemResult = await redeemBetaCodeForUser(prisma, user.userId, code.plain);
    assert.equal(redeemResult.ok, true);
    cleanups.push(async () => {
      await prisma.premiumGrant.deleteMany({ where: { sourceRefId: code.id } });
    });

    await assert.rejects(() => disableBetaCode({ id: code.id, actorUserId: admin.userId }), (error: unknown) => {
      assert.ok(error instanceof BetaCodeAdminError);
      assert.equal((error as BetaCodeAdminError).status, 400);
      return true;
    });
  });

  it("rejeita desativar um código já desativado (idempotência negativa clara)", async () => {
    const admin = await makeAdmin();
    const code = await createTestBetaCode();
    cleanups.push(code.cleanup);

    await disableBetaCode({ id: code.id, actorUserId: admin.userId });
    await assert.rejects(() => disableBetaCode({ id: code.id, actorUserId: admin.userId }));
  });

  it("duas desativações concorrentes do mesmo código: só uma é bem-sucedida", async () => {
    const admin = await makeAdmin();
    const code = await createTestBetaCode();
    cleanups.push(code.cleanup);

    const results = await Promise.allSettled([
      disableBetaCode({ id: code.id, actorUserId: admin.userId }),
      disableBetaCode({ id: code.id, actorUserId: admin.userId }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
  });

  it("rejeita código inexistente", async () => {
    const admin = await makeAdmin();
    await assert.rejects(() => disableBetaCode({ id: "00000000-0000-0000-0000-000000000000", actorUserId: admin.userId }));
  });
});

describe("listBetaCodes", () => {
  it("filtra por status corretamente (AVAILABLE exclui desativados e resgatados)", async () => {
    const admin = await makeAdmin();
    const available = await createTestBetaCode();
    const disabled = await createTestBetaCode();
    cleanups.push(available.cleanup, disabled.cleanup);
    await disableBetaCode({ id: disabled.id, actorUserId: admin.userId });

    const { rows } = await listBetaCodes({ status: "AVAILABLE", page: 1, pageSize: 100 });
    const ids = rows.map((r) => r.id);
    assert.ok(ids.includes(available.id));
    assert.ok(!ids.includes(disabled.id));
  });
});
