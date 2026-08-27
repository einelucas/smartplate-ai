// tests/community/collective-target.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deriveCollectiveTarget } from "../../lib/community/gamification";

describe("deriveCollectiveTarget", () => {
  it("usa a meta editorial quando definida, ignorando o cálculo automático", () => {
    const result = deriveCollectiveTarget({ collectiveTarget: 500, target: 7 }, 10);
    assert.equal(result, 500);
  });

  it("deriva automaticamente (target * participantes) quando não há meta editorial", () => {
    const result = deriveCollectiveTarget({ collectiveTarget: null, target: 7 }, 4);
    assert.equal(result, 28);
  });

  it("nunca zera o divisor mesmo sem nenhum participante ainda", () => {
    const result = deriveCollectiveTarget({ collectiveTarget: null, target: 7 }, 0);
    assert.equal(result, 7);
  });
});
