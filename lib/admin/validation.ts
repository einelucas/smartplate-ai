// lib/admin/validation.ts
// Schemas de validação das entradas do painel administrativo. Nunca confiar
// apenas em validação de frontend — tudo aqui é reforçado no backend.
import { z } from "zod";

// Mesmo teto usado por scripts/generate-beta-codes.cjs — evita que um bug de
// frontend (ou uma chamada direta à API) gere lotes absurdamente grandes.
export const MAX_BETA_BATCH_QUANTITY = 500;
export const MAX_BETA_DURATION_DAYS = 365;

export const createBetaBatchSchema = z.object({
  quantity: z.number().int().min(1).max(MAX_BETA_BATCH_QUANTITY),
  durationDays: z.number().int().min(1).max(MAX_BETA_DURATION_DAYS),
  redeemUntil: z
    .string()
    .datetime({ message: "Data inválida" })
    .optional()
    .refine((value) => !value || new Date(value) > new Date(), { message: "redeemUntil deve ser uma data futura" }),
});

export const revokePremiumGrantSchema = z.object({
  reason: z.string().trim().min(3, "Informe o motivo da revogação").max(500),
});

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
});

export const betaCodeStatusFilterSchema = z.enum(["ALL", "AVAILABLE", "REDEEMED", "DISABLED", "EXPIRED"]).default("ALL");

export const premiumGrantStatusFilterSchema = z.enum(["ALL", "ACTIVE", "EXPIRED", "REVOKED"]).default("ALL");

export const premiumGrantSourceFilterSchema = z.enum(["ALL", "BETA_CODE", "PROMO_CODE", "ADMIN"]).default("ALL");
