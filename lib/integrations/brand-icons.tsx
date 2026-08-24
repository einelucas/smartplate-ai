// lib/integrations/brand-icons.tsx
// Logos oficiais (Simple Icons, via react-icons/si) dos apps que o SmartPlate
// referencia — Connected Apps, histórico privado e compartilhamento externo.
// Usado só para IDENTIFICAR visualmente o app de origem (nunca para sugerir
// parceria/endosso). Nem todo provider tem um logo aqui (ex.: Health
// Connect) — nesse caso o resolver retorna null e o chamador cai no ícone
// genérico de components/icon-registry.tsx.
"use client";

import type { IconType } from "react-icons";
import { SiStrava, SiGarmin, SiApple, SiSamsung, SiNike, SiAdidas, SiFitbit } from "react-icons/si";

export const BRAND_ICONS: Partial<Record<string, IconType>> = {
  STRAVA: SiStrava,
  GARMIN: SiGarmin,
  APPLE_HEALTH: SiApple,
  APPLE_FITNESS: SiApple,
  SAMSUNG_HEALTH: SiSamsung,
  NIKE_RUN_CLUB: SiNike,
  ADIDAS_RUNNING: SiAdidas,
  FITBIT: SiFitbit,
};

export function resolveBrandIcon(provider: string | null | undefined): IconType | null {
  if (!provider) return null;
  return BRAND_ICONS[provider] ?? null;
}
