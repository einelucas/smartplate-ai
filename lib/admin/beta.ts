// lib/admin/beta.ts
// Camada de serviço do painel administrativo de códigos Beta. Reaproveita
// integralmente lib/beta/codes.ts (geração/hash/hint) — nunca duplica a
// lógica de criação de código já usada por scripts/generate-beta-codes.cjs.
import { randomUUID } from "crypto";
import { Prisma, type BetaCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { betaCodeHint, generateBetaCodePlain, hashBetaCode } from "@/lib/beta/codes";
import { getBetaCodeStatus, type BetaCodeStatus } from "@/lib/beta/status";
import { ADMIN_AUDIT_ACTIONS, recordAdminAudit } from "@/lib/admin/audit";
import { resolveUserSummaries, type AdminUserSummary } from "@/lib/admin/users";

export class BetaCodeAdminError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "BetaCodeAdminError";
    this.status = status;
  }
}

type BetaCodeStatusFilter = BetaCodeStatus | "ALL";

/** Mesma precedência de lib/beta/status.ts#getBetaCodeStatus, em forma de WHERE — usada tanto na listagem quanto nos totais do dashboard, pra nunca divergir. */
function betaStatusWhereClause(status: BetaCodeStatus, now: Date): Prisma.BetaCodeWhereInput {
  switch (status) {
    case "DISABLED":
      return { disabledAt: { not: null } };
    case "REDEEMED":
      return { disabledAt: null, redeemedAt: { not: null } };
    case "EXPIRED":
      return { disabledAt: null, redeemedAt: null, redeemUntil: { lt: now } };
    case "AVAILABLE":
      return { disabledAt: null, redeemedAt: null, OR: [{ redeemUntil: null }, { redeemUntil: { gte: now } }] };
  }
}

export interface BetaCodeStats {
  total: number;
  available: number;
  redeemed: number;
  disabled: number;
  expired: number;
}

export async function getBetaCodeStats(): Promise<BetaCodeStats> {
  const now = new Date();
  const [total, available, redeemed, disabled, expired] = await Promise.all([
    prisma.betaCode.count(),
    prisma.betaCode.count({ where: betaStatusWhereClause("AVAILABLE", now) }),
    prisma.betaCode.count({ where: betaStatusWhereClause("REDEEMED", now) }),
    prisma.betaCode.count({ where: betaStatusWhereClause("DISABLED", now) }),
    prisma.betaCode.count({ where: betaStatusWhereClause("EXPIRED", now) }),
  ]);
  return { total, available, redeemed, disabled, expired };
}

export interface BetaCodeAdminRow {
  id: string;
  codeHint: string | null;
  status: BetaCodeStatus;
  batchId: string | null;
  durationDays: number;
  redeemUntil: Date | null;
  redeemedAt: Date | null;
  redeemedByUser: AdminUserSummary | null;
  disabledAt: Date | null;
  disabledByUser: AdminUserSummary | null;
  createdByUser: AdminUserSummary | null;
  createdAt: Date;
}

export async function listBetaCodes({
  status,
  batchId,
  page,
  pageSize,
}: {
  status: BetaCodeStatusFilter;
  batchId?: string;
  page: number;
  pageSize: number;
}): Promise<{ rows: BetaCodeAdminRow[]; total: number }> {
  const now = new Date();
  const where: Prisma.BetaCodeWhereInput = {
    ...(status !== "ALL" ? betaStatusWhereClause(status, now) : {}),
    ...(batchId ? { batchId } : {}),
  };

  const [total, codes] = await Promise.all([
    prisma.betaCode.count({ where }),
    prisma.betaCode.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
  ]);

  const relatedUserIds = codes.flatMap((c) => [c.redeemedByUserId, c.createdByUserId, c.disabledByUserId].filter((v): v is string => !!v));
  const userSummaries = await resolveUserSummaries(relatedUserIds);

  const rows: BetaCodeAdminRow[] = codes.map((code) => ({
    id: code.id,
    codeHint: code.codeHint,
    status: getBetaCodeStatus(code, now),
    batchId: code.batchId,
    durationDays: code.durationDays,
    redeemUntil: code.redeemUntil,
    redeemedAt: code.redeemedAt,
    redeemedByUser: code.redeemedByUserId ? userSummaries.get(code.redeemedByUserId) ?? null : null,
    disabledAt: code.disabledAt,
    disabledByUser: code.disabledByUserId ? userSummaries.get(code.disabledByUserId) ?? null : null,
    createdByUser: code.createdByUserId ? userSummaries.get(code.createdByUserId) ?? null : null,
    createdAt: code.createdAt,
  }));

  return { rows, total };
}

export interface CreateBetaBatchResult {
  batchId: string;
  codes: string[]; // texto puro — existe SÓ neste retorno, nunca persistido
}

export async function createBetaBatch({
  quantity,
  durationDays,
  redeemUntil,
  actorUserId,
}: {
  quantity: number;
  durationDays: number;
  redeemUntil?: Date;
  actorUserId: string;
}): Promise<CreateBetaBatchResult> {
  const batchId = randomUUID();
  const plainCodes: string[] = [];

  for (let i = 0; i < quantity; i++) {
    let created = false;
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      const plain = generateBetaCodePlain();
      const codeHash = hashBetaCode(plain);
      try {
        await prisma.betaCode.create({
          data: {
            codeHash,
            codeHint: betaCodeHint(plain),
            durationDays,
            redeemUntil: redeemUntil ?? null,
            batchId,
            createdByUserId: actorUserId,
          },
        });
        plainCodes.push(plain);
        created = true;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue; // colisão de hash — improvável, tenta outro
        throw error;
      }
    }
    if (!created) {
      throw new BetaCodeAdminError(`Falha ao gerar código único após múltiplas tentativas (índice ${i}).`, 500);
    }
  }

  await recordAdminAudit({
    actorUserId,
    action: ADMIN_AUDIT_ACTIONS.BETA_BATCH_CREATED,
    targetType: "BETA_CODE_BATCH",
    targetId: batchId,
    metadata: { batchId, quantity, durationDays, redeemUntil: redeemUntil ? redeemUntil.toISOString() : null },
  });

  return { batchId, codes: plainCodes };
}

export async function disableBetaCode({ id, actorUserId }: { id: string; actorUserId: string }): Promise<BetaCode> {
  const now = new Date();

  // Mesmo idioma de "claim" atômico usado em lib/beta/redeem.ts: só desativa
  // se, no momento exato do UPDATE, o código ainda não tiver sido resgatado
  // nem desativado — evita corrida com um resgate concorrente.
  const claim = await prisma.betaCode.updateMany({
    where: { id, redeemedByUserId: null, disabledAt: null },
    data: { isActive: false, disabledAt: now, disabledByUserId: actorUserId },
  });

  if (claim.count === 0) {
    const current = await prisma.betaCode.findUnique({ where: { id }, select: { redeemedByUserId: true, disabledAt: true } });
    if (!current) throw new BetaCodeAdminError("Código não encontrado", 404);
    if (current.disabledAt) throw new BetaCodeAdminError("Este código já está desativado", 400);
    if (current.redeemedByUserId) throw new BetaCodeAdminError("Código já utilizado não pode ser desativado", 400);
    throw new BetaCodeAdminError("Não foi possível desativar o código", 400);
  }

  const betaCode = await prisma.betaCode.findUniqueOrThrow({ where: { id } });

  await recordAdminAudit({
    actorUserId,
    action: ADMIN_AUDIT_ACTIONS.BETA_CODE_DISABLED,
    targetType: "BETA_CODE",
    targetId: id,
    metadata: { codeHint: betaCode.codeHint, batchId: betaCode.batchId },
  });

  return betaCode;
}
