// lib/integrations/provider-display.ts
// Metadados de exibição (label/ícone genérico/cor) para toda fonte de
// atividade — tanto o histórico privado (ActivitySource: MANUAL/STRAVA/...)
// quanto o compartilhamento social genérico (ExternalShareProvider: STRAVA/
// GARMIN/NIKE_RUN_CLUB/...). Único lugar que define como cada provider
// aparece na UI — nunca duplicar label/ícone/cor em componente algum.
//
// `icon` aqui é só o FALLBACK genérico (Phosphor, via icon-registry.tsx) —
// para o logo oficial de cada app, ver components/ProviderIcon.tsx, que
// resolve o logo real (lib/integrations/brand-icons.tsx, Simple Icons via
// react-icons) quando existir, e cai neste `icon` quando não existir (ex.:
// Health Connect, "Outro app"). `accentClassName` usa a cor oficial de cada
// marca, já que agora aparece junto do logo real.

export interface ProviderDisplay {
  label: string;
  /** Chave em components/icon-registry.tsx — fallback quando não há logo oficial (ver components/ProviderIcon.tsx). */
  icon: string;
  /** Cor oficial da marca (classe Tailwind já resolvida) — neutra para providers sem uma cor de marca definida aqui. */
  accentClassName: string;
  /** Frase completa para o card social — já resolve a concordância em português. */
  sharedFromLabel: string;
}

const NEUTRAL_ACCENT = "text-slate-500";

export const PROVIDER_DISPLAY: Record<string, ProviderDisplay> = {
  MANUAL: {
    label: "SmartPlate",
    icon: "SealCheck",
    accentClassName: "text-[#007BFF]",
    sharedFromLabel: "Registrado no SmartPlate",
  },
  STRAVA: {
    label: "Strava",
    icon: "PersonSimpleRun",
    accentClassName: "text-[#FC4C02]",
    sharedFromLabel: "Compartilhado do Strava",
  },
  GARMIN: {
    label: "Garmin",
    icon: "Watch",
    accentClassName: "text-[#007CC3]",
    sharedFromLabel: "Compartilhado via Garmin",
  },
  HEALTH_CONNECT: {
    label: "Health Connect",
    icon: "Heartbeat",
    accentClassName: NEUTRAL_ACCENT,
    sharedFromLabel: "Compartilhado via Health Connect",
  },
  APPLE_HEALTH: {
    label: "Apple Health",
    icon: "Heartbeat",
    accentClassName: "text-slate-900",
    sharedFromLabel: "Compartilhado via Apple Health",
  },
  APPLE_FITNESS: {
    label: "Apple Fitness",
    icon: "Heartbeat",
    accentClassName: "text-slate-900",
    sharedFromLabel: "Compartilhado via Apple Fitness",
  },
  SAMSUNG_HEALTH: {
    label: "Samsung Health",
    icon: "Heartbeat",
    accentClassName: "text-[#1428A0]",
    sharedFromLabel: "Compartilhado via Samsung Health",
  },
  FITBIT: {
    label: "Fitbit",
    icon: "Watch",
    accentClassName: "text-[#00B0B9]",
    sharedFromLabel: "Compartilhado via Fitbit",
  },
  NIKE_RUN_CLUB: {
    label: "Nike Run Club",
    icon: "PersonSimpleRun",
    accentClassName: "text-slate-900",
    sharedFromLabel: "Compartilhado via Nike Run Club",
  },
  ADIDAS_RUNNING: {
    label: "Adidas Running",
    icon: "PersonSimpleRun",
    accentClassName: "text-slate-900",
    sharedFromLabel: "Compartilhado via Adidas Running",
  },
  OTHER: {
    label: "Outro app",
    icon: "DotsThreeOutline",
    accentClassName: NEUTRAL_ACCENT,
    sharedFromLabel: "Compartilhado de outro app",
  },
};

export function getProviderDisplay(key: string | null | undefined): ProviderDisplay {
  if (key && key in PROVIDER_DISPLAY) return PROVIDER_DISPLAY[key];
  return PROVIDER_DISPLAY.OTHER;
}

/** "Compartilhado do Strava" -> "Compartilhar do Strava" — título do composer ao abrir já pré-selecionado. */
export function getShareHeading(key: string | null | undefined): string {
  return getProviderDisplay(key).sharedFromLabel.replace(/^Compartilhado/, "Compartilhar");
}
