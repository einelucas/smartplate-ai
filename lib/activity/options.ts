// lib/activity/options.ts
// Opções e regras centralizadas de ActivityLog — nunca espalhar strings de
// tipo/intensidade nem constantes de XP/anti-abuso pelos componentes ou rotas.

export const ACTIVITY_TYPES = [
  { value: "WALKING", label: "Caminhada" },
  { value: "RUNNING", label: "Corrida" },
  { value: "CYCLING", label: "Ciclismo" },
  { value: "STRENGTH", label: "Musculação" },
  { value: "SWIMMING", label: "Natação" },
  { value: "FOOTBALL", label: "Futebol" },
  { value: "SPORT", label: "Esportes" },
  { value: "YOGA", label: "Yoga" },
  { value: "MOBILITY", label: "Mobilidade" },
  { value: "HIIT", label: "HIIT" },
  { value: "OTHER", label: "Outra" },
] as const;

export const ACTIVITY_TYPE_VALUES = ACTIVITY_TYPES.map((t) => t.value);
export type ActivityTypeValue = (typeof ACTIVITY_TYPE_VALUES)[number];

export const ACTIVITY_INTENSITIES = [
  { value: "LIGHT", label: "Leve" },
  { value: "MODERATE", label: "Moderada" },
  { value: "HIGH", label: "Intensa" },
] as const;

export const ACTIVITY_INTENSITY_VALUES = ACTIVITY_INTENSITIES.map((i) => i.value);
export type ActivityIntensityValue = (typeof ACTIVITY_INTENSITY_VALUES)[number];

export function findActivityTypeLabel(value: string): string {
  return ACTIVITY_TYPES.find((t) => t.value === value)?.label ?? value;
}

// Chave em components/icon-registry.tsx — nunca emoji. Centralizado aqui
// para nunca precisar mapear tipo→ícone em mais de um componente.
export const ACTIVITY_TYPE_ICON_KEY: Record<string, string> = {
  WALKING: "PersonSimpleWalk",
  RUNNING: "PersonSimpleRun",
  CYCLING: "Bicycle",
  STRENGTH: "Barbell",
  SWIMMING: "PersonSimpleSwim",
  FOOTBALL: "SoccerBall",
  SPORT: "Basketball",
  YOGA: "FlowerLotus",
  MOBILITY: "PersonSimpleTaiChi",
  HIIT: "Pulse",
  OTHER: "DotsThreeOutline",
};

export function findActivityIntensityLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return ACTIVITY_INTENSITIES.find((i) => i.value === value)?.label ?? value;
}

// ─── Limites de campo ───────────────────────────────────────────────────────

export const ACTIVITY_MAX_DURATION_MIN = 1440; // 24h — teto de segurança, não um valor esperado
export const ACTIVITY_MIN_DURATION_MIN = 1;
export const ACTIVITY_MAX_DISTANCE_KM = 500;
export const ACTIVITY_MAX_NOTES_LENGTH = 300;
export const ACTIVITY_MAX_CUSTOM_NAME_LENGTH = 40;

// ─── Regras de XP (centralizadas — nunca duplicar em rotas) ────────────────

/** Abaixo disso a atividade é registrada normalmente, mas não gera XP. */
export const ACTIVITY_MIN_DURATION_FOR_XP = 10;
export const ACTIVITY_XP_BASE = 10;
export const ACTIVITY_XP_DURATION_BONUS = 5;
export const ACTIVITY_XP_DURATION_BONUS_THRESHOLD_MIN = 30;
export const ACTIVITY_XP_FIRST_OF_DAY_BONUS = 5;
/** Teto diário de XP vindo especificamente de ActivityLog (não inclui XP de desafio/conquista). */
export const ACTIVITY_XP_DAILY_CAP = 40;
