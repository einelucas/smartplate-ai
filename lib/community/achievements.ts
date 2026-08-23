// lib/community/achievements.ts
// Definições de conquistas (código-fonte é a fonte da verdade, não o banco).
// Nunca criar conquistas baseadas em peso/calorias/emagrecimento.
// `icon` é uma chave de components/icon-registry.tsx (nunca emoji nem
// componente direto — precisa ser serializável em JSON/metadata de post).

export type AchievementCode =
  | "FIRST_ACTION"
  | "STREAK_3"
  | "STREAK_7"
  | "STREAK_14"
  | "STREAK_30"
  | "XP_100"
  | "XP_500"
  | "XP_1000"
  | "FIRST_CHALLENGE"
  | "FIRST_GROUP";

export const ACHIEVEMENTS: Record<AchievementCode, { title: string; description: string; icon: string }> = {
  FIRST_ACTION: { title: "Primeiro passo", description: "Você registrou sua primeira ação na Comunidade.", icon: "Plant" },
  STREAK_3: { title: "3 dias de consistência", description: "Você manteve uma sequência de 3 dias.", icon: "Fire" },
  STREAK_7: { title: "7 dias de consistência", description: "Você manteve uma sequência de 7 dias.", icon: "Fire" },
  STREAK_14: { title: "14 dias de consistência", description: "Você manteve uma sequência de 14 dias.", icon: "Fire" },
  STREAK_30: { title: "30 dias de consistência", description: "Você manteve uma sequência de 30 dias.", icon: "Medal" },
  XP_100: { title: "100 XP", description: "Você acumulou 100 XP.", icon: "Star" },
  XP_500: { title: "500 XP", description: "Você acumulou 500 XP.", icon: "Star" },
  XP_1000: { title: "1000 XP", description: "Você acumulou 1000 XP.", icon: "Sparkle" },
  FIRST_CHALLENGE: { title: "Primeiro desafio", description: "Você completou seu primeiro desafio.", icon: "Trophy" },
  FIRST_GROUP: { title: "Comunidade", description: "Você entrou ou criou seu primeiro grupo.", icon: "UsersThree" },
};

const STREAK_THRESHOLDS: Array<[number, AchievementCode]> = [
  [3, "STREAK_3"],
  [7, "STREAK_7"],
  [14, "STREAK_14"],
  [30, "STREAK_30"],
];

const XP_THRESHOLDS: Array<[number, AchievementCode]> = [
  [100, "XP_100"],
  [500, "XP_500"],
  [1000, "XP_1000"],
];

export function getStreakAchievements(currentStreak: number): AchievementCode[] {
  return STREAK_THRESHOLDS.filter(([threshold]) => currentStreak >= threshold).map(([, code]) => code);
}

export function getXpAchievements(totalXp: number): AchievementCode[] {
  return XP_THRESHOLDS.filter(([threshold]) => totalXp >= threshold).map(([, code]) => code);
}

// Níveis — thresholds simples, fáceis de ajustar no futuro.
export const LEVEL_THRESHOLDS = [0, 250, 750, 1500, 3000];

export function computeLevel(totalXp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

export function getLevelProgress(totalXp: number): { level: number; currentLevelXp: number; nextLevelXp: number | null } {
  const level = computeLevel(totalXp);
  const currentLevelXp = LEVEL_THRESHOLDS[level - 1];
  const nextLevelXp = LEVEL_THRESHOLDS[level] ?? null;
  return { level, currentLevelXp, nextLevelXp };
}
