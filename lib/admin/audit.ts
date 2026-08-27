// lib/admin/audit.ts
// Registro de ações administrativas no ledger genérico AuditLog (mesmo
// model já especificado para uso futuro por academias/parceiros — ver
// prisma/schema.prisma). Nunca receber nem gravar código Beta em texto
// puro, token, senha ou outro segredo em metadata.
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const ADMIN_AUDIT_ACTIONS = {
  BETA_BATCH_CREATED: "BETA_BATCH_CREATED",
  BETA_CODE_DISABLED: "BETA_CODE_DISABLED",
  PREMIUM_GRANT_REVOKED: "PREMIUM_GRANT_REVOKED",
} as const;

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[keyof typeof ADMIN_AUDIT_ACTIONS];

interface RecordAdminAuditInput {
  actorUserId: string;
  action: AdminAuditAction;
  targetType: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
}

/** Aceita opcionalmente um client de transação para gravar a auditoria atomicamente junto da ação. */
export async function recordAdminAudit(
  { actorUserId, action, targetType, targetId, metadata }: RecordAdminAuditInput,
  db: Pick<typeof prisma, "auditLog"> = prisma
) {
  await db.auditLog.create({
    data: { actorUserId, action, targetType, targetId, metadata },
  });
}
