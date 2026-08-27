// tests/admin/beta-status.test.ts
// Testes puros (sem banco) da precedência de status derivado de BetaCode.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getBetaCodeStatus } from "../../lib/beta/status";

const now = new Date("2026-08-26T12:00:00Z");

describe("getBetaCodeStatus — precedência", () => {
  it("sem nenhum campo preenchido é AVAILABLE", () => {
    assert.equal(getBetaCodeStatus({ disabledAt: null, redeemedAt: null, redeemUntil: null }, now), "AVAILABLE");
  });

  it("redeemUntil no futuro continua AVAILABLE", () => {
    const future = new Date(now.getTime() + 1000 * 60 * 60);
    assert.equal(getBetaCodeStatus({ disabledAt: null, redeemedAt: null, redeemUntil: future }, now), "AVAILABLE");
  });

  it("redeemUntil no passado é EXPIRED", () => {
    const past = new Date(now.getTime() - 1000 * 60 * 60);
    assert.equal(getBetaCodeStatus({ disabledAt: null, redeemedAt: null, redeemUntil: past }, now), "EXPIRED");
  });

  it("redeemedAt preenchido é REDEEMED mesmo com redeemUntil expirado", () => {
    const past = new Date(now.getTime() - 1000 * 60 * 60);
    assert.equal(getBetaCodeStatus({ disabledAt: null, redeemedAt: now, redeemUntil: past }, now), "REDEEMED");
  });

  it("disabledAt preenchido é DISABLED mesmo se também resgatado ou expirado (maior precedência)", () => {
    const past = new Date(now.getTime() - 1000 * 60 * 60);
    assert.equal(getBetaCodeStatus({ disabledAt: now, redeemedAt: now, redeemUntil: past }, now), "DISABLED");
    assert.equal(getBetaCodeStatus({ disabledAt: now, redeemedAt: null, redeemUntil: past }, now), "DISABLED");
  });
});
