// tests/hydration/validation.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createWaterLogSchema,
  updateWaterGoalSchema,
  localDateQuerySchema,
  WATER_LOG_MIN_ML,
  WATER_LOG_MAX_ML,
  WATER_GOAL_MIN_ML,
  WATER_GOAL_MAX_ML,
} from "../../lib/hydration/validation";

describe("hydration validation — amountMl", () => {
  it("rejeita quantidade negativa", () => {
    assert.equal(createWaterLogSchema.safeParse({ amountMl: -100 }).success, false);
  });
  it("rejeita quantidade zero", () => {
    assert.equal(createWaterLogSchema.safeParse({ amountMl: 0 }).success, false);
  });
  it("rejeita quantidade decimal", () => {
    assert.equal(createWaterLogSchema.safeParse({ amountMl: 250.5 }).success, false);
  });
  it("rejeita quantidade acima do máximo", () => {
    assert.equal(createWaterLogSchema.safeParse({ amountMl: WATER_LOG_MAX_ML + 1 }).success, false);
  });
  it("rejeita NaN", () => {
    assert.equal(createWaterLogSchema.safeParse({ amountMl: Number("abc") }).success, false);
  });
  it("rejeita string não numérica", () => {
    assert.equal(createWaterLogSchema.safeParse({ amountMl: "duzentos" }).success, false);
  });
  it("aceita os valores de fronteira (min e max)", () => {
    assert.equal(createWaterLogSchema.safeParse({ amountMl: WATER_LOG_MIN_ML }).success, true);
    assert.equal(createWaterLogSchema.safeParse({ amountMl: WATER_LOG_MAX_ML }).success, true);
  });
  it("rejeita loggedAt com data inválida", () => {
    assert.equal(createWaterLogSchema.safeParse({ amountMl: 250, loggedAt: "not-a-date" }).success, false);
  });
  it("rejeita loggedAt muito no futuro (além da tolerância de relógio)", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    assert.equal(createWaterLogSchema.safeParse({ amountMl: 250, loggedAt: future }).success, false);
  });
  it("aceita loggedAt dentro da tolerância de futuro (relógio do cliente)", () => {
    const almostNow = new Date(Date.now() + 60 * 1000).toISOString();
    assert.equal(createWaterLogSchema.safeParse({ amountMl: 250, loggedAt: almostNow }).success, true);
  });
});

describe("hydration validation — meta diária", () => {
  it("rejeita meta abaixo do mínimo", () => {
    assert.equal(updateWaterGoalSchema.safeParse({ dailyWaterGoalMl: WATER_GOAL_MIN_ML - 1 }).success, false);
  });
  it("rejeita meta acima do máximo", () => {
    assert.equal(updateWaterGoalSchema.safeParse({ dailyWaterGoalMl: WATER_GOAL_MAX_ML + 1 }).success, false);
  });
  it("rejeita meta decimal", () => {
    assert.equal(updateWaterGoalSchema.safeParse({ dailyWaterGoalMl: 2500.5 }).success, false);
  });
  it("rejeita meta negativa", () => {
    assert.equal(updateWaterGoalSchema.safeParse({ dailyWaterGoalMl: -500 }).success, false);
  });
  it("aceita os valores de fronteira (min e max)", () => {
    assert.equal(updateWaterGoalSchema.safeParse({ dailyWaterGoalMl: WATER_GOAL_MIN_ML }).success, true);
    assert.equal(updateWaterGoalSchema.safeParse({ dailyWaterGoalMl: WATER_GOAL_MAX_ML }).success, true);
  });
});

describe("hydration validation — parâmetro de data (?date=)", () => {
  it("aceita uma data YYYY-MM-DD bem formada", () => {
    assert.equal(localDateQuerySchema.safeParse("2026-08-21").success, true);
  });
  it("rejeita formatos malformados", () => {
    assert.equal(localDateQuerySchema.safeParse("21-08-2026").success, false);
    assert.equal(localDateQuerySchema.safeParse("2026/08/21").success, false);
    assert.equal(localDateQuerySchema.safeParse("not-a-date").success, false);
    assert.equal(localDateQuerySchema.safeParse("").success, false);
  });
});
