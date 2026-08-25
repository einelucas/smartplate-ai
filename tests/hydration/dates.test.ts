// tests/hydration/dates.test.ts
// lib/community/dates.ts é a fonte única de verdade de fuso horário —
// hidratação depende inteiramente dela. Nenhum teste aqui usa offset fixo
// hardcoded (ex.: UTC-3): sempre IANA timezone real, exercitando o cálculo
// verdadeiro (incluindo DST quando o fuso tem).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getLocalDateString, getLocalWeekRange, toUtcDateOnly, withTimezoneBuffer } from "../../lib/community/dates";

describe("getLocalDateString — fuso horário", () => {
  it("usa UTC quando nenhum fuso é informado", () => {
    assert.equal(getLocalDateString(new Date("2026-08-21T12:00:00.000Z"), null), "2026-08-21");
  });

  it("um instante UTC pode pertencer ao dia local ANTERIOR (fuso negativo)", () => {
    // 2026-08-21T02:00:00Z ainda é 2026-08-20 em America/Sao_Paulo (UTC-3)
    assert.equal(getLocalDateString(new Date("2026-08-21T02:00:00.000Z"), "America/Sao_Paulo"), "2026-08-20");
  });

  it("um instante UTC pode pertencer ao dia local SEGUINTE (fuso positivo)", () => {
    // 2026-08-21T22:00:00Z já é 2026-08-22 em Asia/Tokyo (UTC+9)
    assert.equal(getLocalDateString(new Date("2026-08-21T22:00:00.000Z"), "Asia/Tokyo"), "2026-08-22");
  });

  it("registro perto da meia-noite local fica no dia correto (virada exata)", () => {
    // 2026-08-21T02:59:00Z = 2026-08-20T23:59 em America/Sao_Paulo
    assert.equal(getLocalDateString(new Date("2026-08-21T02:59:00.000Z"), "America/Sao_Paulo"), "2026-08-20");
    // um minuto depois já vira o dia seguinte
    assert.equal(getLocalDateString(new Date("2026-08-21T03:00:00.000Z"), "America/Sao_Paulo"), "2026-08-21");
  });

  it("não lança exceção com fuso horário inválido — cai para UTC", () => {
    assert.doesNotThrow(() => getLocalDateString(new Date("2026-08-21T12:00:00.000Z"), "Not/ARealTimezone"));
    assert.equal(getLocalDateString(new Date("2026-08-21T12:00:00.000Z"), "Not/ARealTimezone"), "2026-08-21");
  });
});

describe("getLocalWeekRange — semana local (segunda a domingo)", () => {
  it("resolve a semana a partir de uma sexta-feira", () => {
    const { mondayStr, sundayStr } = getLocalWeekRange("2026-08-21"); // sexta-feira
    assert.equal(mondayStr, "2026-08-17");
    assert.equal(sundayStr, "2026-08-23");
  });

  it("resolve a semana a partir de um domingo (fim, não início, da semana)", () => {
    const { mondayStr, sundayStr } = getLocalWeekRange("2026-08-23"); // domingo
    assert.equal(mondayStr, "2026-08-17");
    assert.equal(sundayStr, "2026-08-23");
  });

  it("resolve a semana a partir de uma segunda-feira (início da semana)", () => {
    const { mondayStr, sundayStr } = getLocalWeekRange("2026-08-17"); // segunda-feira
    assert.equal(mondayStr, "2026-08-17");
    assert.equal(sundayStr, "2026-08-23");
  });
});

describe("withTimezoneBuffer — margem de segurança para busca em UTC", () => {
  it("inclui 2 dias de margem para os dois lados do intervalo local", () => {
    const { gte, lte } = withTimezoneBuffer("2026-08-21", "2026-08-21");
    assert.equal(gte.toISOString().slice(0, 10), "2026-08-19");
    assert.equal(lte.toISOString().slice(0, 10), "2026-08-23");
  });
});

describe("toUtcDateOnly", () => {
  it("gera meia-noite UTC exata para a data local informada", () => {
    assert.equal(toUtcDateOnly("2026-08-21").toISOString(), "2026-08-21T00:00:00.000Z");
  });
});
