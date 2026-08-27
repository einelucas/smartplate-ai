// lib/beta/status.ts
// Status derivado de um BetaCode — nunca inferido ad-hoc no frontend nem
// espalhado por múltiplas rotas. A ordem de precedência importa: um código
// desativado permanece "DISABLED" mesmo se também estivesse expirado.
import type { BetaCode } from "@prisma/client";

export type BetaCodeStatus = "AVAILABLE" | "REDEEMED" | "DISABLED" | "EXPIRED";

export function getBetaCodeStatus(betaCode: Pick<BetaCode, "disabledAt" | "redeemedAt" | "redeemUntil">, now: Date = new Date()): BetaCodeStatus {
  if (betaCode.disabledAt) return "DISABLED";
  if (betaCode.redeemedAt) return "REDEEMED";
  if (betaCode.redeemUntil && betaCode.redeemUntil < now) return "EXPIRED";
  return "AVAILABLE";
}

export const BETA_CODE_STATUS_LABELS: Record<BetaCodeStatus, string> = {
  AVAILABLE: "Disponível",
  REDEEMED: "Utilizado",
  DISABLED: "Desativado",
  EXPIRED: "Expirado",
};
