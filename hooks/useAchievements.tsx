// hooks/useAchievements.tsx
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";
import { getAchievementDisplay } from "@/lib/community/achievements";
import { resolveIcon } from "@/components/icon-registry";

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
    for (const code of query.data.newlyUnlocked) {
      if (celebratedCodes.current.has(code)) continue;
      celebratedCodes.current.add(code);
      const def = getAchievementDisplay(code);
      if (!def) continue;
      const Icon = resolveIcon(def.icon);
      toast.success(`Nova conquista: ${def.title}!`, {
        duration: 5000,
        icon: <Icon size={22} weight="duotone" className="text-amber-500" />,
      });
    }
  }, [query.data?.newlyUnlocked]);

  return query;
}
