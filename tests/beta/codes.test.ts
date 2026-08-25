// tests/beta/codes.test.ts
// Formato/entropia dos códigos Beta — cobre a correção de 60 -> 140 bits de
// entropia (SEGMENT_COUNT 3 -> 7) e a compatibilidade com códigos antigos
// já distribuídos (3 segmentos). Testes puros, sem banco.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BETA_CODE_PREFIX, generateBetaCodePlain, hashBetaCode, isValidBetaCodeFormat, normalizeBetaCode } from "../../lib/beta/codes";

describe("geração de código Beta — formato e entropia", () => {
  it("gera 7 segmentos de 4 caracteres cada", () => {
    const plain = generateBetaCodePlain();
    assert.ok(plain.startsWith(`${BETA_CODE_PREFIX}-`));
    const segments = plain.slice(BETA_CODE_PREFIX.length + 1).split("-");
    assert.equal(segments.length, 7);
    for (const segment of segments) assert.equal(segment.length, 4);
  });

  it("o alfabeto observado em uma amostra grande cobre exatamente os 31 símbolos usados, sem caracteres ambíguos (0/O/1/I/L)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const plain = generateBetaCodePlain();
      for (const ch of plain.slice(BETA_CODE_PREFIX.length + 1).replace(/-/g, "")) seen.add(ch);
    }
    // O alfabeto real (ver lib/beta/codes.ts) tem 31 caracteres, não 32 — "sem 0/O,
    // 1/I/L" remove 5 caracteres do alfabeto alfanumérico maiúsculo de 36 (dígitos +
    // letras), resultando em 31, não 32. Ainda assim a entropia final (~138,7 bits
    // com 7 segmentos) fica bem acima do mínimo de 128 bits exigido — ver teste abaixo.
    assert.equal(seen.size, 31);
    for (const ambiguous of ["0", "O", "1", "I", "L"]) {
      assert.ok(!seen.has(ambiguous), `caractere ambíguo "${ambiguous}" não deveria aparecer`);
    }
  });

  it("~138,7 bits de entropia (7 segmentos * 4 caracteres * log2(31)) satisfazem o mínimo de 128 bits exigido", () => {
    const segmentCount = 7;
    const segmentLength = 4;
    const alphabetSize = 31; // ver lib/beta/codes.ts — "23456789ABCDEFGHJKMNPQRSTUVWXYZ".length === 31
    const totalBits = segmentCount * segmentLength * Math.log2(alphabetSize);
    assert.ok(totalBits >= 128, `entropia calculada (${totalBits} bits) abaixo do mínimo exigido`);
  });

  it("um código gerado já nasce normalizado e válido", () => {
    const plain = generateBetaCodePlain();
    const normalized = normalizeBetaCode(plain);
    assert.equal(normalized, plain);
    assert.equal(isValidBetaCodeFormat(normalized), true);
  });

  it("aceita o formato antigo de 3 segmentos (compatibilidade com códigos já distribuídos antes da correção)", () => {
    assert.equal(isValidBetaCodeFormat("SPBETA-K7XM-P9RQ-T4NW"), true);
  });

  it("rejeita formatos claramente inválidos", () => {
    assert.equal(isValidBetaCodeFormat("SPBETA-AB"), false);
    assert.equal(isValidBetaCodeFormat("NOTBETA-K7XM-P9RQ-T4NW"), false);
    assert.equal(isValidBetaCodeFormat(""), false);
  });

  it("normalizeBetaCode reagrupa separadores/caixa diferentes para o mesmo valor canônico", () => {
    const a = normalizeBetaCode("spbeta k7xm-p9rq_t4nw");
    const b = normalizeBetaCode("SPBETA-K7XM-P9RQ-T4NW");
    assert.equal(a, b);
  });

  it("hashBetaCode é determinístico e nunca retorna o texto puro", () => {
    const normalized = normalizeBetaCode("SPBETA-K7XM-P9RQ-T4NW");
    const hash1 = hashBetaCode(normalized);
    const hash2 = hashBetaCode(normalized);
    assert.equal(hash1, hash2);
    assert.notEqual(hash1, normalized);
    assert.equal(hash1.length, 64); // sha256 em hex
  });
});
