// lib/admin/premium.ts
// Camada de serviço do painel administrativo de PremiumGrant. Nunca toca em
// Profile.subscriptionActive/stripeSubscriptionId — revogar um grant é uma
// operação isolada ao PremiumGrant, e resolvePremiumAccess (lib/premium/
// access.ts) já ignora grants revogados automaticamente pelo filtro
// `revokedAt: null`. Isso garante, por construção, que revogar um grant do
// Beta nunca cancela uma assinatura Stripe ativa do mesmo usuário.
import { Prisma, type PremiumGrant, type PremiumGrantSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ADMIN_AUDIT_ACTIONS, recordAdminAudit } from "@/lib/admin/audit";
import { resolveUserSummaries, type AdminUserSummary } from "@/lib/admin/users";

export class PremiumGrantAdminError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "PremiumGrantAdminError";
    this.status = status;
  }
}

export type PremiumGrantStatus = "ACTIVE" | "EXPIRED" | "REVOKED";
type PremiumGrantStatusFilter = PremiumGrantStatus | "ALL";
type PremiumGrantSourceFilter = PremiumGrantSource | "ALL";

export function derivePremiumGrantStatus(grant: Pick<PremiumGrant, "revokedAt" | "expiresAt">, now: Date = new Date()): PremiumGrantStatus {
  if (grant.revokedAt) return "REVOKED";
  if (grant.expiresAt <= now) return "EXPIRED";
  return "ACTIVE";
}

/** Mesma precedência de derivePremiumGrantStatus, em forma de WHERE — usada na listagem e nos totais do dashboard. */
function premiumGrantStatusWhereClause(status: PremiumGrantStatus, now: Date): Prisma.PremiumGrantWhereInput {
  switch (status) {
    case "REVOKED":
      return { revokedAt: { not: null } };
    case "EXPIRED":
      return { revokedAt: null, expiresAt: { lte: now } };
    case "ACTIVE":
      return { revokedAt: null, expiresAt: { gt: now } };
  }
}

export interface PremiumGrantStats {
  active: number;
  expired: number;
  revoked: number;
}

export async function getPremiumGrantStats(): Promise<PremiumGrantStats> {
  const now = new Date();
  const [active, expired, revoked] = await Promise.all([
    prisma.premiumGrant.count({ where: premiumGrantStatusWhereClause("ACTIVE", now) }),
    prisma.premiumGrant.count({ where: premiumGrantStatusWhereClause("EXPIRED", now) }),
    prisma.premiumGrant.count({ where: premiumGrantStatusWhereClause("REVOKED", now) }),
  ]);
  return { active, expired, revoked };
}

export interface PremiumGrantAdminRow {
  id: string;
  status: PremiumGrantStatus;
  source: PremiumGrantSource;
  user: AdminUserSummary | null;
  userId: string;
  startsAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedByUser: AdminUserSummary | null;
  revokedReason: string | null;
  sourceRefId: string | null;
  createdAt: Date;
}

export async function listPremiumGrants({
  status,
  source,
  userId,
  page,
  pageSize,
}: {
  status: PremiumGrantStatusFilter;
  source: PremiumGrantSourceFilter;
  userId?: string;
  page: number;
  pageSize: number;
}): Promise<{ rows: PremiumGrantAdminRow[]; total: number }> {
  const now = new Date();
  const where: Prisma.PremiumGrantWhereInput = {
    ...(status !== "ALL" ? premiumGrantStatusWhereClause(status, now) : {}),
    ...(source !== "ALL" ? { source } : {}),
    ...(userId ? { userId } : {}),
  };

  const [total, grants] = await Promise.all([
    prisma.premiumGrant.count({ where }),
    prisma.premiumGrant.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
  ]);

  const relatedUserIds = grants.flatMap((g) => [g.userId, g.revokedByUserId].filter((v): v is string => !!v));
  const userSummaries = await resolveUserSummaries(relatedUserIds);

  const rows: PremiumGrantAdminRow[] = grants.map((grant) => ({
    id: grant.id,
    status: derivePremiumGrantStatus(grant, now),
    source: grant.source,
    user: userSummaries.get(grant.userId) ?? null,
    userId: grant.userId,
    startsAt: grant.startsAt,
    expiresAt: grant.expiresAt,
    revokedAt: grant.revokedAt,
    revokedByUser: grant.revokedByUserId ? userSummaries.get(grant.revokedByUserId) ?? null : null,
    revokedReason: grant.revokedReason,
    sourceRefId: grant.sourceRefId,
    createdAt: grant.createdAt,
  }));

  return { rows, total };
}

export async function revokePremiumGrant({ id, actorUserId, reason }: { id: string; actorUserId: string; reason: string }): Promise<PremiumGrant> {
  const now = new Date();
  const grant = await prisma.premiumGrant.findUnique({ where: { id } });
  if (!grant) throw new PremiumGrantAdminError("Grant não encontrado", 404);

  // updateMany com guarda `revokedAt: null` — evita revogar duas vezes sob concorrência.
  const claim = await prisma.premiumGrant.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: now, revokedByUserId: actorUserId, revokedReason: reason },
  });
  if (claim.count === 0) {
    throw new PremiumGrantAdminError("Este grant já foi revogado", 400);
  }

  await recordAdminAudit({
    actorUserId,
    action: ADMIN_AUDIT_ACTIONS.PREMIUM_GRANT_REVOKED,
    targetType: "PREMIUM_GRANT",
    targetId: id,
    metadata: { reason, previousExpiresAt: grant.expiresAt.toISOString(), userId: grant.userId, source: grant.source },
  });

  return { ...grant, revokedAt: now, revokedByUserId: actorUserId, revokedReason: reason };
}
