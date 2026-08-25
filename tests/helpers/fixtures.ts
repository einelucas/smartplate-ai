// tests/helpers/fixtures.ts
// Fixtures isoladas para os testes de hidratação e Beta — nunca tocam
// contas reais. userId sempre prefixado com "test-" (Clerk nunca gera IDs
// nesse formato) e sempre limpo ao final de cada teste via cleanup().
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { generateBetaCodePlain, hashBetaCode, normalizeBetaCode } from "../../lib/beta/codes";

export interface TestUser {
  userId: string;
  cleanup: () => Promise<void>;
}

export async function createTestUser(opts: { timezone?: string } = {}): Promise<TestUser> {
  const suffix = randomUUID();
  const userId = `test-${suffix}`;

  await prisma.profile.create({
    data: { userId, email: `test-${suffix}@example.invalid` },
  });

  await prisma.socialProfile.create({
    data: {
      userId,
      username: `test_${suffix.slice(0, 8)}`,
      displayName: "Test User",
      timezone: opts.timezone ?? "UTC",
    },
  });

  return {
    userId,
    // onDelete: Cascade em todas as relações de Profile (WaterLog, DailyActivity,
    // XpEvent, UserAchievement, SocialProfile, UserGamification, PremiumGrant)
    // — apagar o Profile já limpa tudo que o teste criou para este usuário.
    cleanup: async () => {
      await prisma.profile.delete({ where: { userId } }).catch(() => {});
    },
  };
}

export interface TestBetaCode {
  id: string;
  plain: string;
  cleanup: () => Promise<void>;
}

export async function createTestBetaCode(
  opts: { durationDays?: number; isActive?: boolean; redeemUntil?: Date | null } = {}
): Promise<TestBetaCode> {
  const plain = generateBetaCodePlain();
  const normalized = normalizeBetaCode(plain);
  const codeHash = hashBetaCode(normalized);

  const row = await prisma.betaCode.create({
    data: {
      codeHash,
      codeHint: normalized.slice(-4),
      durationDays: opts.durationDays ?? 30,
      isActive: opts.isActive ?? true,
      redeemUntil: opts.redeemUntil ?? null,
    },
  });

  return {
    id: row.id,
    plain,
    cleanup: async () => {
      await prisma.betaCode.delete({ where: { id: row.id } }).catch(() => {});
    },
  };
}
