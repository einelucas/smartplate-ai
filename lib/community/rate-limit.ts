// lib/community/rate-limit.ts
// Rate limiting básico via contagem no Postgres — sem provisionar Redis/
// Upstash (nenhum serviço de cache está configurado no projeto hoje, e o
// volume de abuso esperado nesta fase não justifica nova infra). Cada
// chamada é 1 único `count()` na própria tabela do recurso, sem nenhuma
// tabela nova. O caller passa a contagem já filtrada por seu próprio campo
// de autoria (authorUserId/reporterUserId variam por model) — este módulo
// só decide "excedeu ou não", nunca sabe o shape de cada tabela.

export class RateLimitError extends Error {
  status = 429;
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

interface RateLimitConfig {
  windowMinutes: number;
  max: number;
  message: string;
}

export const RATE_LIMITS = {
  createPost: { windowMinutes: 60, max: 10, message: "Você atingiu o limite de publicações por hora. Tente novamente mais tarde." },
  createComment: { windowMinutes: 60, max: 30, message: "Você atingiu o limite de comentários por hora. Tente novamente mais tarde." },
  createReport: { windowMinutes: 60, max: 20, message: "Você atingiu o limite de denúncias por hora. Tente novamente mais tarde." },
} as const satisfies Record<string, RateLimitConfig>;

/** count(userId, createdAt >= agora - windowMinutes) na tabela informada; lança RateLimitError se >= max. */
export async function checkRateLimit(
  count: () => Promise<number>,
  config: RateLimitConfig
): Promise<void> {
  const current = await count();
  if (current >= config.max) {
    throw new RateLimitError(config.message);
  }
}

export function windowStart(windowMinutes: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - windowMinutes * 60 * 1000);
}
