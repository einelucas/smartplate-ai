// lib/community/achievements.ts
// Definições de conquistas (código-fonte é a fonte da verdade, não o banco).
// Nunca criar conquistas baseadas em peso/calorias/emagrecimento.
// `icon` é uma chave de components/icon-registry.tsx (nunca emoji nem
// componente direto — precisa ser serializável em JSON/metadata de post).
//
// STREAK_3/7/14/30 costumavam viver aqui (motor antigo, concedidas dentro de
// checkAndUnlockAchievements a partir do streak "ao vivo" no instante de cada
// refeição/atividade). Migradas para achievement-catalog.ts +
// achievement-engine.ts, que agora são a ÚNICA fonte de desbloqueio para
// STREAK_* — contra UserGamification.longestStreak, resolvido via
// reconcileAchievements (ver checklist seção 22). getAchievementDisplay cai
// automaticamente pro catálogo novo para esses códigos.
import { ACHIEVEMENT_CATALOG } from "./achievement-catalog";

export type AchievementCode = "FIRST_ACTION" | "XP_100" | "XP_500" | "XP_1000" | "FIRST_CHALLENGE" | "FIRST_GROUP";

export const ACHIEVEMENTS: Record<AchievementCode, { title: string; description: string; icon: string }> = {
  FIRST_ACTION: { title: "Primeiro passo", description: "Você registrou sua primeira ação na Comunidade.", icon: "Plant" },
  XP_100: { title: "100 XP", description: "Você acumulou 100 XP.", icon: "Star" },
  XP_500: { title: "500 XP", description: "Você acumulou 500 XP.", icon: "Star" },
  XP_1000: { title: "1000 XP", description: "Você acumulou 1000 XP.", icon: "Sparkle" },
  FIRST_CHALLENGE: { title: "Primeiro desafio", description: "Você completou seu primeiro desafio.", icon: "Trophy" },
  FIRST_GROUP: { title: "Comunidade", description: "Você entrou ou criou seu primeiro grupo.", icon: "UsersThree" },
};

export interface AchievementDisplay {
  title: string;
  description: string;
  icon: string;
}

/**
 * Resolve título/descrição/ícone de uma conquista pra exibição (celebração,
 * post de compartilhamento) — checa o catálogo antigo primeiro (este
 * arquivo, com FIRST_ACTION, STREAK_3/7/14/30, XP_100/500/1000,
 * FIRST_CHALLENGE, FIRST_GROUP, ainda concedidos pelo motor antigo) e cai
 * pro catálogo novo (achievement-catalog.ts, com 50 e tantas conquistas
 * reais como MEALS_10, WATER_GOAL_7_DAYS, ACTIVITIES_50, BALANCED_WEEK)
 * quando o código não existe ali.
 *
 * Corrige o bug de "não consigo compartilhar conquistas": antes, tanto
 * POST /api/community/posts quanto AchievementCelebration.tsx só
 * enxergavam o catálogo antigo (ACHIEVEMENTS) — qualquer conquista do
 * catálogo novo (a maioria das que existem hoje) falhava com "Conquista
 * inválida" (400) ao tentar publicar, e a própria celebração de
 * desbloqueio não aparecia (retornava null silenciosamente).
 */
export function getAchievementDisplay(code: string): AchievementDisplay | null {
  const legacy = (ACHIEVEMENTS as Record<string, AchievementDisplay | undefined>)[code];
  if (legacy) return legacy;
  const modern = ACHIEVEMENT_CATALOG[code];
  if (modern) return { title: modern.title, description: modern.description, icon: modern.icon };
  return null;
}

const XP_THRESHOLDS: Array<[number, AchievementCode]> = [
  [100, "XP_100"],
  [500, "XP_500"],
  [1000, "XP_1000"],
];

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
