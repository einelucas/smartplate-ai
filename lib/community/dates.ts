// lib/community/dates.ts
// Helpers de data/timezone para gamificação (streak, ranking semanal).
// Nunca usar DayPlan.day (nome do dia da semana) para calcular streak — ele
// não representa uma data real. Sempre usar a data local do evento.

const DEFAULT_TIMEZONE = "UTC";

function formatLocalDate(date: Date, timeZone: string): string {
  // en-CA formata diretamente como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Data local (YYYY-MM-DD) do usuário para o instante informado. */
export function getLocalDateString(date: Date, timezone?: string | null): string {
  try {
    return formatLocalDate(date, timezone || DEFAULT_TIMEZONE);
  } catch {
    // Timezone inválida (nunca deveria acontecer, mas não pode quebrar o fluxo de XP).
    return formatLocalDate(date, DEFAULT_TIMEZONE);
  }
}

/** Converte "YYYY-MM-DD" em Date UTC à meia-noite (para colunas @db.Date). */
export function toUtcDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** Diferença em dias inteiros entre duas datas UTC-midnight (b - a). */
export function diffInCalendarDays(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

/**
 * Janela da semana corrente em UTC: segunda 00:00 -> domingo 23:59:59.999.
 * Uniforme para todos os usuários (não ajustada por timezone individual) —
 * simplificação de MVP para um ranking compartilhado consistente.
 */
export function getUtcWeekWindow(now: Date = new Date()): { start: Date; end: Date } {
  const day = now.getUTCDay(); // 0 = domingo
  const diffToMonday = day === 0 ? 6 : day - 1;
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday, 0, 0, 0, 0)
  );
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  end.setUTCMilliseconds(-1);
  return { start, end };
}

/**
 * Semana local (segunda a domingo) que contém a data local informada
 * ("YYYY-MM-DD"). Faz aritmética de calendário pura sobre a string — nunca
 * calcula o instante UTC da meia-noite local (evitaria lidar com offset/DST
 * sem biblioteca de timezone); a entrada já deve vir de getLocalDateString.
 */
export function getLocalWeekRange(localDateStr: string): { mondayStr: string; sundayStr: string } {
  const asUtc = new Date(`${localDateStr}T00:00:00.000Z`);
  const day = asUtc.getUTCDay(); // 0 = domingo
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(asUtc);
  monday.setUTCDate(asUtc.getUTCDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { mondayStr: monday.toISOString().slice(0, 10), sundayStr: sunday.toISOString().slice(0, 10) };
}

/** Primeiro e último dia (strings "YYYY-MM-DD") do mês local que contém a data informada. */
export function getLocalMonthRange(localDateStr: string): { firstStr: string; lastStr: string } {
  const [year, month] = localDateStr.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0)); // dia 0 do mês seguinte = último dia do mês atual
  return { firstStr: first.toISOString().slice(0, 10), lastStr: last.toISOString().slice(0, 10) };
}

/** Tempo relativo em pt-BR para timestamps do feed (ex.: "2h atrás"). */
export function formatRelativeTime(date: Date | string): string {
  const target = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - target.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d atrás`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}sem atrás`;
  return target.toLocaleDateString("pt-BR");
}
