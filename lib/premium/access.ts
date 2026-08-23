// lib/premium/access.ts
// Fonte única de verdade para "o usuário tem acesso Premium?". Combina
// assinatura Stripe (Profile.subscriptionActive) com concessões manuais
// (PremiumGrant — hoje só BETA_CODE). Qualquer ponto do app que hoje decide
// acesso Premium olhando só para subscriptionActive deve passar a usar isto,
// para que Beta e Stripe abram exatamente as mesmas portas.
import { prisma } from "@/lib/prisma";
import type { PremiumGrantSource } from "@prisma/client";

export interface PremiumAccess {
  isPremium: boolean;
  source: "STRIPE" | PremiumGrantSource | null;
  expiresAt: Date | null; // null quando a fonte é Stripe (sem grant) ou sem acesso algum
}

export async function resolvePremiumAccess(userId: string): Promise<PremiumAccess> {
  const now = new Date();

  const [profile, grant] = await Promise.all([
    prisma.profile.findUnique({ where: { userId }, select: { subscriptionActive: true } }),
    prisma.premiumGrant.findFirst({
      where: { userId, revokedAt: null, startsAt: { lte: now }, expiresAt: { gt: now } },
      orderBy: { expiresAt: "desc" },
    }),
  ]);

  if (profile?.subscriptionActive) {
    return { isPremium: true, source: "STRIPE", expiresAt: null };
  }

  if (grant) {
    return { isPremium: true, source: grant.source, expiresAt: grant.expiresAt };
  }

  return { isPremium: false, source: null, expiresAt: null };
}

export async function hasPremiumAccess(userId: string): Promise<boolean> {
  const access = await resolvePremiumAccess(userId);
  return access.isPremium;
}
