// lib/hydration/validation.ts
// Regras e limites centralizados de hidratação — nunca duplicar estes
// números em rota nenhuma. Toda validação relevante é sempre reforçada no
// backend (Zod), mesmo quando a interface já valida também.
import { z } from "zod";

export const WATER_LOG_MIN_ML = 1;
export const WATER_LOG_MAX_ML = 5000;

export const WATER_GOAL_MIN_ML = 500;
export const WATER_GOAL_MAX_ML = 10000;

export const DEFAULT_DAILY_WATER_GOAL_ML = 2500;

// z.number() já rejeita NaN; Number.isInteger via .int() rejeita decimais.
// Nunca aceitar negativo/zero — min(1) cobre os dois.
const amountMlSchema = z.number().int("Quantidade deve ser um número inteiro de ml").min(WATER_LOG_MIN_ML).max(WATER_LOG_MAX_ML);

// Tolerância pequena pro relógio do cliente — mesmo padrão de ActivityLog.
const loggedAtSchema = z.coerce.date().refine((date) => date.getTime() <= Date.now() + 5 * 60 * 1000, {
  message: "Data/hora do registro não pode estar no futuro",
});

export const createWaterLogSchema = z.object({
  amountMl: amountMlSchema,
  loggedAt: loggedAtSchema.optional(),
});

export const updateWaterLogSchema = z.object({
  amountMl: amountMlSchema.optional(),
  loggedAt: loggedAtSchema.optional(),
});

export const updateWaterGoalSchema = z.object({
  dailyWaterGoalMl: z.number().int("Meta deve ser um número inteiro de ml").min(WATER_GOAL_MIN_ML).max(WATER_GOAL_MAX_ML),
});

export const localDateQuerySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
