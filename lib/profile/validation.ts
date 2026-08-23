// lib/profile/validation.ts
// Validação centralizada (Zod) para Perfil/onboarding, seguindo o mesmo
// padrão de lib/community/validation.ts. Username reutiliza o schema já
// existente da Comunidade — não duplicar essa regra aqui.
import { z } from "zod";
import { usernameSchema } from "@/lib/community/validation";
import { BUDGET_LEVEL_VALUES, COOKING_LEVEL_VALUES, DIET_GOAL_VALUES, DIET_TYPE_VALUES } from "./options";

export { usernameSchema };

export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "smartplate",
  "smartplateai",
  "support",
  "suporte",
  "moderator",
  "moderacao",
  "system",
  "sistema",
]);

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username.trim().toLowerCase());
}

// ─── Identidade ─────────────────────────────────────────────────────────────

export const displayNameSchema = z.string().trim().min(1, "Nome é obrigatório").max(40, "Nome muito longo");
export const bioSchema = z.string().trim().max(280, "Bio muito longa").optional().nullable();

// ─── Dados físicos ──────────────────────────────────────────────────────────
// Limites plausíveis para evitar dados absurdos (ex.: altura em metros por engano).

export const heightCmSchema = z
  .number()
  .int()
  .min(50, "Altura inválida")
  .max(260, "Altura inválida");

export const weightKgSchema = z
  .number()
  .min(20, "Peso inválido")
  .max(400, "Peso inválido");

export const dietGoalSchema = z.enum(DIET_GOAL_VALUES as [string, ...string[]]);
export const dietTypeSchema = z.enum(DIET_TYPE_VALUES as [string, ...string[]]);
export const cookingLevelSchema = z.enum(COOKING_LEVEL_VALUES as [string, ...string[]]);
export const budgetLevelSchema = z.enum(BUDGET_LEVEL_VALUES as [string, ...string[]]);

export const updatePhysicalDataSchema = z.object({
  height: heightCmSchema.optional(),
  currentWeight: weightKgSchema.optional(),
  targetWeight: weightKgSchema.optional(),
  startWeight: weightKgSchema.optional(),
  dietType: dietTypeSchema.optional(),
  cookingLevel: cookingLevelSchema.optional(),
});

// ─── Preferências ───────────────────────────────────────────────────────────

const foodListSchema = z.array(z.string().trim().min(1).max(40)).max(30);

export const updatePreferencesSchema = z.object({
  allergies: foodListSchema.optional(),
  preferredFoods: foodListSchema.optional(),
  dislikedFoods: foodListSchema.optional(),
  maxPrepTime: z.number().int().min(1).max(480).nullable().optional(),
  budgetLevel: budgetLevelSchema.optional(),
  dietGoal: dietGoalSchema.optional(),
  additionalNotes: z.string().trim().max(500).optional().nullable(),
});

// ─── Registro de peso ───────────────────────────────────────────────────────

export const registerWeightSchema = z.object({
  weight: weightKgSchema,
  notes: z.string().trim().max(200).optional().nullable(),
  date: z.coerce.date().optional(),
});

// ─── Onboarding completo ────────────────────────────────────────────────────

export const completeOnboardingSchema = z.object({
  // Identidade
  displayName: displayNameSchema,
  username: usernameSchema,
  bio: bioSchema,
  timezone: z.string().trim().min(1).max(64).optional(),
  // Objetivo e físico
  height: heightCmSchema,
  currentWeight: weightKgSchema,
  targetWeight: weightKgSchema,
  dietGoal: dietGoalSchema,
  // Alimentação
  dietType: dietTypeSchema,
  allergies: foodListSchema.default([]),
  // Gostos
  preferredFoods: foodListSchema.default([]),
  dislikedFoods: foodListSchema.default([]),
  // Rotina
  cookingLevel: cookingLevelSchema,
  maxPrepTime: z.number().int().min(1).max(480).nullable().optional(),
  budgetLevel: budgetLevelSchema,
  additionalNotes: z.string().trim().max(500).optional().nullable(),
});
