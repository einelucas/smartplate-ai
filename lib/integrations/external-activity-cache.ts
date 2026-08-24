// lib/integrations/external-activity-cache.ts
// Purga do cache transitório de atividades externas — nunca deixamos um
// registro de provider externo virar histórico permanente (política em
// provider-policy.ts: maxCacheDays). Chamada antes/depois de cada
// sincronização (ver app/api/integrations/strava/sync/route.ts).
import { prisma } from "@/lib/prisma";

export async function purgeExpiredExternalActivityCache(userId?: string): Promise<number> {
  const result = await prisma.externalActivityCache.deleteMany({
    where: { expiresAt: { lt: new Date() }, ...(userId ? { userId } : {}) },
  });
  return result.count;
}
