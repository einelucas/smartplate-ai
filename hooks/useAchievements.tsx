// hooks/useAchievements.tsx
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { queueAchievementUnlocks } from "@/components/achievements/AchievementUnlockProvider";
import type { AchievementRarity } from "@/lib/community/achievement-catalog";

export type AchievementStatus = "UNLOCKED" | "LOCKED" | "COMING_SOON";

export interface Achievement {
  code: string;
  title: string;
  description: string;
  unlockDescription: string;
  category: string;
  icon: string;
  target: number;
  availability: "AVAILABLE" | "COMING_SOON";
  comingSoonReason?: string;
  /** Ausente = COMMON (ver lib/community/achievement-catalog.ts). */
  rarity?: AchievementRarity;
  status: AchievementStatus;
  progress: number | null;
  unlockedAt: string | null;
}

export interface AchievementsResponse {
  summary: { unlocked: number; total: number; percentage: number };
  achievements: Achievement[];
  newlyUnlocked: string[];
}

const QUERY_KEY = ["achievements"];

export function useAchievements() {
  const { isSignedIn } = useUser();
  const celebratedCodes = useRef<Set<string>>(new Set());

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/achievements");
      if (!res.ok) throw new Error("Erro ao buscar conquistas");
      return (await res.json()) as AchievementsResponse;
    },
    enabled: isSignedIn,
  });

  useEffect(() => {
    if (!query.data?.newlyUnlocked?.length) return;
    const fresh = query.data.newlyUnlocked.filter((code) => !celebratedCodes.current.has(code));
    if (fresh.length === 0) return;
    fresh.forEach((code) => celebratedCodes.current.add(code));
    queueAchievementUnlocks(fresh);
  }, [query.data?.newlyUnlocked]);

  return query;
}
