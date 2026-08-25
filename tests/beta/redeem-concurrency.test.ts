// tests/beta/redeem-concurrency.test.ts
// QA formal do Beta (checklist seção 38) — concorrência real via Promise.all
// contra o banco de fato, não apenas revisão de código. Usa
// redeemBetaCodeForUser diretamente (mesma função que a rota HTTP chama),
// com fixtures isoladas sempre limpas ao final.
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { redeemBetaCodeForUser } from "../../lib/beta/redeem";
import { createTestUser, createTestBetaCode, type TestUser, type TestBetaCode } from "../helpers/fixtures";

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

async function makeCode(opts?: Parameters<typeof createTestBetaCode>[0]): Promise<TestBetaCode> {
  const code = await createTestBetaCode(opts);
  cleanups.push(code.cleanup);
  return code;
}

describe("resgate de código Beta — concorrência real (duas ativações simultâneas do MESMO código)", () => {
  it("só uma ativação vence; a outra é rejeitada; só um PremiumGrant é criado; nenhum estado parcial", async () => {
    const code = await makeCode();
    const userA = await makeUser();
    const userB = await makeUser();

    const [resultA, resultB] = await Promise.all([
      redeemBetaCodeForUser(prisma, userA.userId, code.plain),
      redeemBetaCodeForUser(prisma, userB.userId, code.plain),
    ]);

    const outcomes = [resultA, resultB];
    const winners = outcomes.filter((r) => r.ok === true);
    const losers = outcomes.filter((r) => r.ok === false);

    assert.equal(winners.length, 1, "exatamente uma das duas ativações concorrentes deve vencer");
    assert.equal(losers.length, 1, "a outra deve ser rejeitada, nunca as duas vencerem");
    assert.equal((losers[0] as { status: number }).status, 409);

    // Nenhum estado parcial: exatamente 1 PremiumGrant para este código, e o
    // BetaCode ficou marcado com exatamente um redeemedByUserId (o vencedor).
    const grants = await prisma.premiumGrant.findMany({ where: { sourceRefId: code.id } });
    assert.equal(grants.length, 1);

    const freshCode = await prisma.betaCode.findUnique({ where: { id: code.id } });
    assert.ok(freshCode?.redeemedByUserId === userA.userId || freshCode?.redeemedByUserId === userB.userId);

    cleanups.push(async () => {
      await prisma.premiumGrant.deleteMany({ where: { sourceRefId: code.id } });
    });
  });

  it("dez ativações concorrentes do mesmo código: só uma vence, nove são rejeitadas", async () => {
    const code = await makeCode();
    const users = await Promise.all(Array.from({ length: 10 }, () => makeUser()));

    const results = await Promise.all(users.map((u) => redeemBetaCodeForUser(prisma, u.userId, code.plain)));
    const winners = results.filter((r) => r.ok === true);
    const losers = results.filter((r) => r.ok === false);

    assert.equal(winners.length, 1);
    assert.equal(losers.length, 9);

    const grants = await prisma.premiumGrant.findMany({ where: { sourceRefId: code.id } });
    assert.equal(grants.length, 1);

    cleanups.push(async () => {
      await prisma.premiumGrant.deleteMany({ where: { sourceRefId: code.id } });
    });
  });
});

describe("resgate de código Beta — múltiplos usuários / múltiplos códigos", () => {
  it("ativar Código A com Conta A concede Premium; reusar Código A com Conta B é rejeitado; Conta A com Código B (não usado) também é rejeitada", async () => {
    const codeA = await makeCode();
    const codeB = await makeCode();
    const userA = await makeUser();
    const userB = await makeUser();

    const first = await redeemBetaCodeForUser(prisma, userA.userId, codeA.plain);
    assert.equal(first.ok, true);
    if (first.ok) {
      assert.equal(first.alreadyRedeemed, false);
      assert.ok(first.expiresAt);
    }
    cleanups.push(async () => {
      await prisma.premiumGrant.deleteMany({ where: { sourceRefId: codeA.id } });
    });

    // Código A já usado — Conta B tentando o mesmo código é rejeitada.
    const codeAByB = await redeemBetaCodeForUser(prisma, userB.userId, codeA.plain);
    assert.equal(codeAByB.ok, false);
    if (codeAByB.ok === false) assert.equal(codeAByB.status, 409);

    // Conta A já usou um código — Código B (nunca usado) também é rejeitado para ela.
    const codeBByA = await redeemBetaCodeForUser(prisma, userA.userId, codeB.plain);
    assert.equal(codeBByA.ok, false);

    // Código B continua livre para outra conta.
    const codeBByB = await redeemBetaCodeForUser(prisma, userB.userId, codeB.plain);
    assert.equal(codeBByB.ok, true);
    cleanups.push(async () => {
      await prisma.premiumGrant.deleteMany({ where: { sourceRefId: codeB.id } });
    });
  });

  it("resgatar o mesmo código de novo (retry do próprio usuário) é idempotente — não cria um segundo PremiumGrant", async () => {
    const code = await makeCode();
    const user = await makeUser();

    const first = await redeemBetaCodeForUser(prisma, user.userId, code.plain);
    assert.equal(first.ok, true);
    cleanups.push(async () => {
      await prisma.premiumGrant.deleteMany({ where: { sourceRefId: code.id } });
    });

    const retry = await redeemBetaCodeForUser(prisma, user.userId, code.plain);
    assert.equal(retry.ok, true);
    if (retry.ok) assert.equal(retry.alreadyRedeemed, true);

    const grants = await prisma.premiumGrant.findMany({ where: { sourceRefId: code.id } });
    assert.equal(grants.length, 1);
  });

  it("código inativo é rejeitado sem ser consumido", async () => {
    const code = await makeCode({ isActive: false });
    const user = await makeUser();

    const result = await redeemBetaCodeForUser(prisma, user.userId, code.plain);
    assert.equal(result.ok, false);

    const grants = await prisma.premiumGrant.findMany({ where: { sourceRefId: code.id } });
    assert.equal(grants.length, 0);
  });

  it("código com prazo de resgate expirado é rejeitado", async () => {
    const code = await makeCode({ redeemUntil: new Date(Date.now() - 24 * 60 * 60 * 1000) });
    const user = await makeUser();

    const result = await redeemBetaCodeForUser(prisma, user.userId, code.plain);
    assert.equal(result.ok, false);
  });

  it("usuário com assinatura paga ativa não consome o código (rejeitado, código continua livre)", async () => {
    const code = await makeCode();
    const user = await makeUser();
    await prisma.profile.update({ where: { userId: user.userId }, data: { subscriptionActive: true } });

    const result = await redeemBetaCodeForUser(prisma, user.userId, code.plain);
    assert.equal(result.ok, false);

    const freshCode = await prisma.betaCode.findUnique({ where: { id: code.id } });
    assert.equal(freshCode?.redeemedByUserId, null);
  });

  it("código com formato/hash inexistente é rejeitado", async () => {
    const user = await makeUser();
    const result = await redeemBetaCodeForUser(prisma, user.userId, "SPBETA-0000-0000-0000-0000-0000-0000-0000");
    assert.equal(result.ok, false);
  });
});
