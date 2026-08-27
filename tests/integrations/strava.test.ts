// tests/integrations/strava.test.ts
// computeStravaSyncAfterEpoch é a única parte determinística e testável sem
// rede real da sincronização do Strava (o resto da rota depende de chamadas
// HTTP reais à API oficial — sem sandbox, ver checklist seção 11-continuação).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeStravaSyncAfterEpoch } from "../../lib/integrations/strava";
import { EXTERNAL_ACTIVITY_CACHE_MAX_DAYS } from "../../lib/integrations/provider-policy";

describe("computeStravaSyncAfterEpoch", () => {
  it("com sincronização anterior, usa lastSyncedAt menos 1 dia de folga", () => {
    const lastSyncedAt = new Date("2026-08-20T12:00:00Z");
    const result = computeStravaSyncAfterEpoch(lastSyncedAt);
    const expected = Math.floor(lastSyncedAt.getTime() / 1000) - 24 * 60 * 60;
    assert.equal(result, expected);
  });

  it("sem sincronização anterior, limita à janela de retenção do cache (nunca busca todo o histórico)", () => {
    const now = new Date("2026-08-26T12:00:00Z");
    const result = computeStravaSyncAfterEpoch(null, now);
    const expected = Math.floor((now.getTime() - EXTERNAL_ACTIVITY_CACHE_MAX_DAYS * 24 * 60 * 60 * 1000) / 1000);
    assert.equal(result, expected);
  });

  it("a folga de 1 dia é sempre aplicada, mesmo com lastSyncedAt muito recente", () => {
    const lastSyncedAt = new Date();
    const result = computeStravaSyncAfterEpoch(lastSyncedAt);
    assert.ok(result < Math.floor(lastSyncedAt.getTime() / 1000), "afterEpoch deve ficar no passado em relação a lastSyncedAt");
  });
});
