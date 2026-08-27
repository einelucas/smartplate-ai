// lib/admin/dashboard.ts
import { prisma } from "@/lib/prisma";
import { getBetaCodeStats, type BetaCodeStats } from "@/lib/admin/beta";
import { getPremiumGrantStats, type PremiumGrantStats } from "@/lib/admin/premium";

export interface AdminDashboardStats {
  usersCount: number;
  betaCodes: BetaCodeStats;
  premiumGrants: PremiumGrantStats;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [usersCount, betaCodes, premiumGrants] = await Promise.all([prisma.profile.count(), getBetaCodeStats(), getPremiumGrantStats()]);
  return { usersCount, betaCodes, premiumGrants };
}
