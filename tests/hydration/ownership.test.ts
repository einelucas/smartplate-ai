// tests/hydration/ownership.test.ts
// Prova, no nível do Prisma, a garantia real usada pelas rotas
// (app/api/hydration/logs/[id]/route.ts): updateMany/deleteMany sempre
// filtram por {id, userId} no próprio comando de banco — nunca um
// findUnique por id isolado seguido de um `if` no app. Isso é o que de fato
// impede um usuário de editar/excluir/ler o registro de outro.
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { withTimezoneBuffer } from "../../lib/community/dates";
import { getEligibleWaterLogs } from "../../lib/hydration/stats";
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

describe("propriedade de registros de hidratação", () => {
  it("updateMany com userId de outro usuário não afeta o registro (count 0, valor original preservado)", async () => {
    const owner = await makeUser();
    const attacker = await makeUser();
    const log = await prisma.waterLog.create({ data: { userId: owner.userId, amountMl: 300, loggedAt: new Date("2026-08-21T12:00:00.000Z") } });

    const attempt = await prisma.waterLog.updateMany({
      where: { id: log.id, userId: attacker.userId },
      data: { amountMl: 9999 },
    });
    assert.equal(attempt.count, 0);

    const stillOriginal = await prisma.waterLog.findUnique({ where: { id: log.id } });
    assert.equal(stillOriginal?.amountMl, 300);
  });

  it("deleteMany com userId de outro usuário não remove o registro (count 0, registro continua existindo)", async () => {
    const owner = await makeUser();
    const attacker = await makeUser();
    const log = await prisma.waterLog.create({ data: { userId: owner.userId, amountMl: 300, loggedAt: new Date("2026-08-21T12:00:00.000Z") } });

    const attempt = await prisma.waterLog.deleteMany({ where: { id: log.id, userId: attacker.userId } });
    assert.equal(attempt.count, 0);

    const stillThere = await prisma.waterLog.findUnique({ where: { id: log.id } });
    assert.ok(stillThere);
  });

  it("o dono consegue atualizar/excluir seu próprio registro com o mesmo padrão de comando", async () => {
    const owner = await makeUser();
    const log = await prisma.waterLog.create({ data: { userId: owner.userId, amountMl: 300, loggedAt: new Date("2026-08-21T12:00:00.000Z") } });

    const update = await prisma.waterLog.updateMany({ where: { id: log.id, userId: owner.userId }, data: { amountMl: 400 } });
    assert.equal(update.count, 1);

    const del = await prisma.waterLog.deleteMany({ where: { id: log.id, userId: owner.userId } });
    assert.equal(del.count, 1);
  });

  it("a leitura de um usuário nunca inclui registros de outro usuário", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    await prisma.waterLog.create({ data: { userId: userA.userId, amountMl: 500, loggedAt: new Date("2026-08-21T12:00:00.000Z") } });

    const rangeB = await getEligibleWaterLogs(prisma, userB.userId, withTimezoneBuffer("2026-08-21", "2026-08-21"));
    assert.deepEqual(rangeB, []);

    const rangeA = await getEligibleWaterLogs(prisma, userA.userId, withTimezoneBuffer("2026-08-21", "2026-08-21"));
    assert.equal(rangeA.length, 1);
  });
});
