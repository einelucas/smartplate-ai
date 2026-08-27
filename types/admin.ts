// types/admin.ts
// Tipos compartilhados do frontend do painel administrativo (shape das
// respostas de /api/admin/**). Datas chegam como string (serialização JSON).

export interface AdminUserSummary {
  userId: string;
  email: string;
  username: string | null;
  displayName: string | null;
}

export type BetaCodeStatus = "AVAILABLE" | "REDEEMED" | "DISABLED" | "EXPIRED";

export interface BetaCodeAdminRow {
  id: string;
  codeHint: string | null;
  status: BetaCodeStatus;
  batchId: string | null;
  durationDays: number;
  redeemUntil: string | null;
  redeemedAt: string | null;
  redeemedByUser: AdminUserSummary | null;
  disabledAt: string | null;
  disabledByUser: AdminUserSummary | null;
  createdByUser: AdminUserSummary | null;
  createdAt: string;
}

export interface BetaCodeStats {
  total: number;
  available: number;
  redeemed: number;
  disabled: number;
  expired: number;
}

export type PremiumGrantStatus = "ACTIVE" | "EXPIRED" | "REVOKED";
export type PremiumGrantSource = "BETA_CODE" | "PROMO_CODE" | "ADMIN";

export interface PremiumGrantAdminRow {
  id: string;
  status: PremiumGrantStatus;
  source: PremiumGrantSource;
  user: AdminUserSummary | null;
  userId: string;
  startsAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokedByUser: AdminUserSummary | null;
  revokedReason: string | null;
  sourceRefId: string | null;
  createdAt: string;
}

export interface PremiumGrantStats {
  active: number;
  expired: number;
  revoked: number;
}

export interface AdminDashboardStats {
  usersCount: number;
  betaCodes: BetaCodeStats;
  premiumGrants: PremiumGrantStats;
}

export interface CreateBetaBatchResult {
  batchId: string;
  codes: string[];
}
