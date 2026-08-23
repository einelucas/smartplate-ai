// lib/beta/codes.ts
// Geração/normalização/hash de códigos Beta. O código puro (plaintext)
// NUNCA é persistido — só o hash SHA-256 (ver prisma/schema.prisma#BetaCode).
import crypto from "crypto";

export const BETA_CODE_PREFIX = "SPBETA";

// Alfabeto sem caracteres visualmente confusos: sem 0/O, 1/I/L.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const SEGMENT_LENGTH = 4;
const SEGMENT_COUNT = 3;

const BETA_CODE_FORMAT = new RegExp(`^${BETA_CODE_PREFIX}(-[A-Z0-9]{${SEGMENT_LENGTH}}){${SEGMENT_COUNT}}$`);

function randomSegment(length: number): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/** Gera um código Beta em texto puro, ex.: SPBETA-K7XM-P9RQ-T4NW. Só existe em memória — nunca persistir isto. */
export function generateBetaCodePlain(): string {
  const segments = Array.from({ length: SEGMENT_COUNT }, () => randomSegment(SEGMENT_LENGTH));
  return `${BETA_CODE_PREFIX}-${segments.join("-")}`;
}

/**
 * trim + uppercase + remove qualquer separador e reagrupa em blocos de 4.
 * "spbeta k7xm-p9rq_t4nw" e "SPBETA-K7XM-P9RQ-T4NW" normalizam para o mesmo valor.
 */
export function normalizeBetaCode(input: string): string {
  const stripped = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!stripped.startsWith(BETA_CODE_PREFIX)) return stripped;

  const rest = stripped.slice(BETA_CODE_PREFIX.length);
  const segments: string[] = [];
  for (let i = 0; i < rest.length; i += SEGMENT_LENGTH) {
    segments.push(rest.slice(i, i + SEGMENT_LENGTH));
  }
  return [BETA_CODE_PREFIX, ...segments].join("-");
}

export function isValidBetaCodeFormat(normalizedCode: string): boolean {
  return BETA_CODE_FORMAT.test(normalizedCode);
}

export function hashBetaCode(normalizedCode: string): string {
  return crypto.createHash("sha256").update(normalizedCode).digest("hex");
}

/** Só para conferência humana no gerador/admin (ex.: "…T4NW") — nunca o código completo. */
export function betaCodeHint(normalizedCode: string): string {
  return normalizedCode.slice(-4);
}
