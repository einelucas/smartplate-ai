// lib/admin/users.ts
// Resolução em lote de dados de exibição de usuário (email + username) pra
// tabelas administrativas — nunca N+1: sempre 2 findMany por página, não 1
// por linha.
import { prisma } from "@/lib/prisma";

export interface AdminUserSummary {
  userId: string;
  email: string;
  username: string | null;
  displayName: string | null;
}

export async function resolveUserSummaries(userIds: string[]): Promise<Map<string, AdminUserSummary>> {
  const uniqueIds = Array.from(new Set(userIds));
  if (uniqueIds.length === 0) return new Map();

  const [profiles, socialProfiles] = await Promise.all([
    prisma.profile.findMany({ where: { userId: { in: uniqueIds } }, select: { userId: true, email: true } }),
    prisma.socialProfile.findMany({ where: { userId: { in: uniqueIds } }, select: { userId: true, username: true, displayName: true } }),
  ]);

  const socialByUserId = new Map(socialProfiles.map((s) => [s.userId, s]));
  const map = new Map<string, AdminUserSummary>();
  for (const profile of profiles) {
    const social = socialByUserId.get(profile.userId);
    map.set(profile.userId, {
      userId: profile.userId,
      email: profile.email,
      username: social?.username ?? null,
      displayName: social?.displayName ?? null,
    });
  }
  // Usuário pode ter sido removido do Profile mas ainda referenciado por um
  // registro antigo (ex.: createdByUserId de um admin desativado) — nesse
  // caso não entra no map, e o chamador trata como "usuário desconhecido".
  return map;
}
