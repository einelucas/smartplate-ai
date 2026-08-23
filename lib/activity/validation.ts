// lib/activity/validation.ts
import { z } from "zod";
import {
  ACTIVITY_INTENSITY_VALUES,
  ACTIVITY_MAX_CUSTOM_NAME_LENGTH,
  ACTIVITY_MAX_DISTANCE_KM,
  ACTIVITY_MAX_DURATION_MIN,
  ACTIVITY_MAX_NOTES_LENGTH,
  ACTIVITY_MIN_DURATION_MIN,
  ACTIVITY_TYPE_VALUES,
} from "./options";

const activityTypeSchema = z.enum(ACTIVITY_TYPE_VALUES as [string, ...string[]]);
const intensitySchema = z.enum(ACTIVITY_INTENSITY_VALUES as [string, ...string[]]);

// Nunca aceitar NaN/0/negativo/valor absurdo — z.number() já rejeita NaN.
const durationMinSchema = z
  .number()
  .int("Duração deve ser um número inteiro de minutos")
  .min(ACTIVITY_MIN_DURATION_MIN, "Duração inválida")
  .max(ACTIVITY_MAX_DURATION_MIN, "Duração muito longa");

const distanceKmSchema = z.number().positive("Distância inválida").max(ACTIVITY_MAX_DISTANCE_KM, "Distância inválida");

// Não pode ser muito no futuro (tolerância pequena para relógio do cliente).
const performedAtSchema = z.coerce.date().refine((date) => date.getTime() <= Date.now() + 5 * 60 * 1000, {
  message: "Data/hora da atividade não pode estar no futuro",
});

export const createActivityLogSchema = z
  .object({
    activityType: activityTypeSchema,
    customActivityName: z.string().trim().max(ACTIVITY_MAX_CUSTOM_NAME_LENGTH).optional().nullable(),
    durationMin: durationMinSchema,
    distanceKm: distanceKmSchema.optional().nullable(),
    intensity: intensitySchema.optional().nullable(),
    notes: z.string().trim().max(ACTIVITY_MAX_NOTES_LENGTH).optional().nullable(),
    performedAt: performedAtSchema,
  })
  .refine((data) => data.activityType !== "OTHER" || !!data.customActivityName?.trim(), {
    message: "Informe o nome da atividade",
    path: ["customActivityName"],
  });

// PATCH: mesmos campos, todos opcionais — backend faz merge com o registro
// existente antes de decidir o que persistir. Sem re-avaliação de XP aqui.
export const updateActivityLogSchema = z.object({
  activityType: activityTypeSchema.optional(),
  customActivityName: z.string().trim().max(ACTIVITY_MAX_CUSTOM_NAME_LENGTH).optional().nullable(),
  durationMin: durationMinSchema.optional(),
  distanceKm: distanceKmSchema.optional().nullable(),
  intensity: intensitySchema.optional().nullable(),
  notes: z.string().trim().max(ACTIVITY_MAX_NOTES_LENGTH).optional().nullable(),
  performedAt: performedAtSchema.optional(),
});
