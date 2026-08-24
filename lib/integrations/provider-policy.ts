// lib/integrations/provider-policy.ts
// Política central de provider — a ÚNICA fonte de verdade sobre o que cada
// fonte de atividade pode ou não fazer. Nenhum outro arquivo deve conter
// `if (provider === "STRAVA")`/`if (source === "STRAVA")` para decidir
// comportamento; em vez disso, consulte `getProviderPolicy(provider)` e
// ramifique pela flag (ex.: `if (!policy.allowPublicGamification) return`).
//
// Nesta versão, TODO provider externo (Strava, Garmin, Health Connect, Apple
// Health, Samsung Health, Fitbit, Other) é tratado como estritamente privado:
// nunca gera XP público, nunca conta em ranking/desafio, nunca vira
// ActivityLog permanente nem post automático. Só MANUAL (o próprio usuário
// registrando no SmartPlate) tem a política completa liberada. Ver
// ExternalActivityCache (schema) para onde dados de provider externo vivem.

export type ExternalProvider =
  | "MANUAL"
  | "STRAVA"
  | "GARMIN"
  | "HEALTH_CONNECT"
  | "APPLE_HEALTH"
  | "SAMSUNG_HEALTH"
  | "FITBIT"
  | "OTHER";

export interface ProviderPolicy {
  /** Pode virar um ActivityLog completo (gamificado: XP/streak/desafio). */
  allowPersistentActivity: boolean;
  /** Pode virar um CommunityPost do tipo ACTIVITY (compartilhamento social direto do dado sincronizado). */
  allowSocialSharing: boolean;
  /** Conta para XP público, ranking (qualquer escopo) ou progresso de desafio social. */
  allowPublicGamification: boolean;
  /** Dado só pode ser exibido na área privada do próprio usuário — nunca a terceiros. */
  privateDisplayOnly: boolean;
  /** Retenção máxima de cache transitório (dias). `null` = sem cache (não persiste, só fetch sob demanda). */
  maxCacheDays: number | null;
}

const RESTRICTED_EXTERNAL_POLICY: ProviderPolicy = {
  allowPersistentActivity: false,
  allowSocialSharing: false,
  allowPublicGamification: false,
  privateDisplayOnly: true,
  maxCacheDays: 7,
};

export const EXTERNAL_PROVIDER_POLICIES: Record<ExternalProvider, ProviderPolicy> = {
  MANUAL: {
    allowPersistentActivity: true,
    allowSocialSharing: true,
    allowPublicGamification: true,
    privateDisplayOnly: false,
    maxCacheDays: null,
  },
  // Todo provider externo começa com a mesma política restritiva por
  // padrão — nenhum está implementado além do Strava nesta versão, mas a
  // política já está pronta para quando estiverem (Garmin, Health Connect,
  // Apple/Samsung Health, Fitbit). Nunca afrouxar sem decisão explícita.
  STRAVA: { ...RESTRICTED_EXTERNAL_POLICY },
  GARMIN: { ...RESTRICTED_EXTERNAL_POLICY },
  HEALTH_CONNECT: { ...RESTRICTED_EXTERNAL_POLICY },
  APPLE_HEALTH: { ...RESTRICTED_EXTERNAL_POLICY },
  SAMSUNG_HEALTH: { ...RESTRICTED_EXTERNAL_POLICY },
  FITBIT: { ...RESTRICTED_EXTERNAL_POLICY },
  OTHER: { ...RESTRICTED_EXTERNAL_POLICY },
};

/** Nunca lança — provider desconhecido cai na política mais restritiva (fail-closed). */
export function getProviderPolicy(provider: string): ProviderPolicy {
  return EXTERNAL_PROVIDER_POLICIES[provider as ExternalProvider] ?? RESTRICTED_EXTERNAL_POLICY;
}

export const EXTERNAL_ACTIVITY_CACHE_MAX_DAYS = 7;
