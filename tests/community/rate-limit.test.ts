// tests/community/rate-limit.test.ts
// checkRateLimit é puro (recebe a contagem já pronta) — sem banco.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit, RateLimitError, windowStart } from "../../lib/community/rate-limit";

describe("checkRateLimit", () => {
  it("passa quando a contagem está abaixo do limite", async () => {
    await checkRateLimit(async () => 3, { windowMinutes: 60, max: 10, message: "limite" });
  });

  it("lança RateLimitError quando a contagem atinge o limite", async () => {
    await assert.rejects(
      () => checkRateLimit(async () => 10, { windowMinutes: 60, max: 10, message: "Limite atingido" }),
      (error: unknown) => {
        assert.ok(error instanceof RateLimitError);
        assert.equal((error as RateLimitError).status, 429);
        assert.equal((error as RateLimitError).message, "Limite atingido");
        return true;
      }
    );
  });

  it("lança quando a contagem já excede o limite (não só no exato limite)", async () => {
    await assert.rejects(() => checkRateLimit(async () => 15, { windowMinutes: 60, max: 10, message: "limite" }));
  });
});

describe("windowStart", () => {
  it("calcula o início da janela subtraindo minutos do agora informado", () => {
    const now = new Date("2026-08-26T12:00:00Z");
    const start = windowStart(60, now);
    assert.equal(start.toISOString(), "2026-08-26T11:00:00.000Z");
  });
});
