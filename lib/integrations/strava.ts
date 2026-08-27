// lib/integrations/strava.ts
// Cliente server-only da API oficial do Strava (OAuth 2.0 + REST v3).
// Endpoints/campos confirmados em developers.strava.com/docs/authentication
// e developers.strava.com/docs/webhooks (não implementações de terceiros).
// Nenhuma função aqui expõe token ao chamador além do necessário para uso
// imediato no servidor — nunca retornar token bruto para uma rota que possa
// serializá-lo na resposta HTTP.
import { encryptToken, decryptToken } from "./token-crypto";
import { EXTERNAL_ACTIVITY_CACHE_MAX_DAYS } from "./provider-policy";

const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_REVOKE_URL = "https://www.strava.com/oauth/revoke";
const STRAVA_API_BASE = "https://www.strava.com/api/v3";

// Escopo mínimo necessário para leitura de atividades (item 74 do checklist:
// "solicitar apenas scopes necessários"). `read` dá acesso básico ao perfil
// (necessário para identificar o athlete id); `activity:read_all` cobre
// também atividades marcadas como privadas/"somente eu" no Strava — sem ele
// o usuário só veria uma sincronização parcial e inconsistente.
export const STRAVA_SCOPES = "read,activity:read_all";

export function isStravaConfigured(): boolean {
  return !!(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET && process.env.STRAVA_REDIRECT_URI);
}

function requireStravaEnv() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const redirectUri = process.env.STRAVA_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Strava não configurado: defina STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET e STRAVA_REDIRECT_URI");
  }
  return { clientId, clientSecret, redirectUri };
}

export function buildStravaAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = requireStravaEnv();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: STRAVA_SCOPES,
    state,
  });
  return `${STRAVA_AUTHORIZE_URL}?${params.toString()}`;
}

export interface StravaTokenResponse {
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch seconds
  expires_in: number;
  scope?: string;
  athlete?: { id: number };
}

async function callStravaTokenEndpoint(body: Record<string, string>): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Falha ao comunicar com o Strava (token endpoint): ${res.status} ${detail}`);
  }
  return res.json();
}

/** Troca o authorization code do callback por tokens. Nunca chamar fora do servidor. */
export async function exchangeStravaAuthorizationCode(code: string): Promise<StravaTokenResponse> {
  const { clientId, clientSecret } = requireStravaEnv();
  return callStravaTokenEndpoint({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
  });
}

async function refreshStravaAccessToken(refreshTokenPlain: string): Promise<StravaTokenResponse> {
  const { clientId, clientSecret } = requireStravaEnv();
  return callStravaTokenEndpoint({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshTokenPlain,
  });
}

export interface EncryptedTokenPair {
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  expiresAt: Date;
  scope?: string;
  athleteId?: number;
}

export function packStravaTokenResponse(tokens: StravaTokenResponse): EncryptedTokenPair {
  return {
    accessTokenEncrypted: encryptToken(tokens.access_token),
    // O Strava pode retornar um refresh_token novo a cada renovação — SEMPRE
    // persistir o mais recente devolvido, nunca reaproveitar o anterior
    // (checklist item 71).
    refreshTokenEncrypted: encryptToken(tokens.refresh_token),
    expiresAt: new Date(tokens.expires_at * 1000),
    scope: tokens.scope,
    athleteId: tokens.athlete?.id,
  };
}

/**
 * Garante um access token válido para uma ConnectedApp já existente,
 * renovando via refresh token se necessário (o access token do Strava dura
 * ~6h). Retorna o access token em texto puro SÓ para uso imediato dentro do
 * servidor (nunca repassar ao client) + os novos campos criptografados para
 * persistir no ConnectedApp caso tenha havido renovação.
 */
export async function ensureFreshStravaAccessToken(connectedApp: {
  accessTokenEncrypted: string | null;
  refreshTokenEncrypted: string | null;
  expiresAt: Date | null;
}): Promise<{ accessToken: string; refreshed: EncryptedTokenPair | null }> {
  if (!connectedApp.accessTokenEncrypted || !connectedApp.refreshTokenEncrypted) {
    throw new Error("Conexão com o Strava incompleta — reconecte");
  }

  const stillValid = connectedApp.expiresAt && connectedApp.expiresAt.getTime() - Date.now() > 5 * 60 * 1000; // margem de 5min
  if (stillValid) {
    return { accessToken: decryptToken(connectedApp.accessTokenEncrypted), refreshed: null };
  }

  const refreshTokenPlain = decryptToken(connectedApp.refreshTokenEncrypted);
  const tokens = await refreshStravaAccessToken(refreshTokenPlain);
  const packed = packStravaTokenResponse(tokens);
  return { accessToken: tokens.access_token, refreshed: packed };
}

/** Endpoint atual (pós 2026-06-01) de revogação — ver developers.strava.com/docs/authentication. */
export async function revokeStravaAccessToken(accessTokenPlain: string): Promise<void> {
  const { clientId, clientSecret } = requireStravaEnv();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(STRAVA_REVOKE_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ token: accessTokenPlain, token_type_hint: "access_token" }).toString(),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Falha ao revogar token no Strava: ${res.status} ${detail}`);
  }
}

export interface StravaActivitySummary {
  id: number;
  name: string;
  type: string; // "Run", "Ride", "Walk", "WeightTraining", ...
  start_date: string; // ISO
  elapsed_time: number; // segundos
  distance: number; // metros
}

/** GET /activities/{id} — usado pelo webhook (que só manda o ID, nunca o payload completo). */
export async function fetchStravaActivityById(accessTokenPlain: string, activityId: string): Promise<StravaActivitySummary> {
  const res = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessTokenPlain}` },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Falha ao buscar atividade ${activityId} no Strava: ${res.status} ${detail}`);
  }
  return res.json();
}

/**
 * Janela incremental de sincronização (epoch em segundos, formato exigido
 * pelo parâmetro `after` da API do Strava) — extraída de app/api/integrations/
 * strava/sync/route.ts pra ser testável sem precisar de uma chamada de rede
 * real. Com sincronização anterior: `lastSyncedAt - 1 dia` (folga pra cobrir
 * atividades registradas com atraso no Strava). Sem sincronização anterior:
 * limita à janela de retenção do cache — nunca baixa todo o histórico de uma vez.
 */
export function computeStravaSyncAfterEpoch(lastSyncedAt: Date | null, now: Date = new Date()): number {
  if (lastSyncedAt) {
    return Math.floor(lastSyncedAt.getTime() / 1000) - 24 * 60 * 60;
  }
  return Math.floor((now.getTime() - EXTERNAL_ACTIVITY_CACHE_MAX_DAYS * 24 * 60 * 60 * 1000) / 1000);
}

/** GET /athlete/activities — paginado; nunca busca "tudo" de uma vez (checklist item 83). */
export async function fetchStravaActivities(
  accessTokenPlain: string,
  params: { after?: number; page?: number; perPage?: number } = {}
): Promise<StravaActivitySummary[]> {
  const search = new URLSearchParams();
  if (params.after) search.set("after", String(params.after));
  search.set("page", String(params.page ?? 1));
  search.set("per_page", String(Math.min(params.perPage ?? 30, 100)));

  const res = await fetch(`${STRAVA_API_BASE}/athlete/activities?${search.toString()}`, {
    headers: { Authorization: `Bearer ${accessTokenPlain}` },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Falha ao buscar atividades no Strava: ${res.status} ${detail}`);
  }
  return res.json();
}

// ─── Normalização Strava -> DTO interno (ExternalActivityCache) ───────────

const STRAVA_TYPE_TO_INTERNAL: Record<string, string> = {
  Run: "RUNNING",
  TrailRun: "RUNNING",
  Walk: "WALKING",
  Hike: "WALKING",
  Ride: "CYCLING",
  MountainBikeRide: "CYCLING",
  GravelRide: "CYCLING",
  WeightTraining: "STRENGTH",
  Workout: "STRENGTH",
  Swim: "SWIMMING",
  Soccer: "FOOTBALL",
  Yoga: "YOGA",
  Crossfit: "HIIT",
  HighIntensityIntervalTraining: "HIIT",
};

export function mapStravaTypeToInternal(stravaType: string): string {
  return STRAVA_TYPE_TO_INTERNAL[stravaType] ?? "OTHER";
}

export interface NormalizedExternalActivity {
  provider: "STRAVA";
  externalId: string;
  activityType: string;
  name: string | null;
  durationMin: number;
  distanceKm: number | null;
  performedAt: Date;
}

export function normalizeStravaActivity(raw: StravaActivitySummary): NormalizedExternalActivity {
  return {
    provider: "STRAVA",
    externalId: String(raw.id),
    activityType: mapStravaTypeToInternal(raw.type),
    name: raw.name ?? null,
    durationMin: Math.round(raw.elapsed_time / 60),
    distanceKm: raw.distance ? Math.round((raw.distance / 1000) * 100) / 100 : null,
    performedAt: new Date(raw.start_date),
  };
}
