-- Painel administrativo (Beta + Premium): campos de auditoria aditivos em
-- BetaCode/PremiumGrant e novo ledger genérico AuditLog. Nenhuma coluna
-- existente é alterada ou removida — só adições, sem risco a dado existente.

-- AlterTable: PremiumGrant — auditoria de revogação administrativa (ver lib/admin/premium.ts)
ALTER TABLE "PremiumGrant" ADD COLUMN "revokedByUserId" TEXT;
ALTER TABLE "PremiumGrant" ADD COLUMN "revokedReason" TEXT;

-- CreateIndex
CREATE INDEX "PremiumGrant_revokedAt_idx" ON "PremiumGrant"("revokedAt");

-- AlterTable: BetaCode — agrupamento de lote, autoria e desativação administrativa (ver lib/admin/beta.ts)
ALTER TABLE "BetaCode" ADD COLUMN "batchId" TEXT;
ALTER TABLE "BetaCode" ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "BetaCode" ADD COLUMN "disabledAt" TIMESTAMP(3);
ALTER TABLE "BetaCode" ADD COLUMN "disabledByUserId" TEXT;

-- CreateIndex
CREATE INDEX "BetaCode_batchId_idx" ON "BetaCode"("batchId");

-- CreateTable: AuditLog — ledger administrativo genérico (schema já especificado
-- em SMARTPLATE_PARCEIROS_ACADEMIAS_IMPLEMENTACAO.md secao 76, para reuso futuro
-- por academias/parceiros via tenantType/tenantId)
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "tenantType" TEXT,
    "tenantId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_tenantType_tenantId_createdAt_idx" ON "AuditLog"("tenantType", "tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");
