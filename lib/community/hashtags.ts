// lib/community/hashtags.ts
// Extração, normalização e persistência de hashtags. O backend é sempre a
// autoridade final (o frontend só detecta pra UX — ver PostComposerModal) —
// toda publicação/edição reprocessa o texto aqui, nunca confia em hashtags
// enviadas prontas pelo cliente. Case-insensitive: #Corrida / #CORRIDA /
// #corrida todas normalizam pra "corrida".
import type { Db } from "./types";

export const MAX_HASHTAGS_PER_POST = 5;

// Letras (com acentos), números e underline — sem espaço, sem símbolos.
// Comprimento entre 2 e 30 caracteres após normalização.
const HASHTAG_TOKEN_REGEX = /#([\p{L}\p{N}_]{2,30})/gu;
const VALID_NORMALIZED_REGEX = /^[\p{L}\p{N}_]{2,30}$/u;
const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

/** lowercase + remove acentos + tira "#"/espaços — mesma hashtag em qualquer grafia vira a mesma chave. */
export function normalizeHashtag(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "");
}

export function isValidHashtag(normalized: string): boolean {
  return VALID_NORMALIZED_REGEX.test(normalized);
}

/** Extrai do texto livre, normaliza, deduplica e limita a MAX_HASHTAGS_PER_POST — mesma extração usada em criação e edição. */
export function extractHashtags(text: string | null | undefined): string[] {
  if (!text) return [];
  const found: string[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(HASHTAG_TOKEN_REGEX)) {
    const normalized = normalizeHashtag(match[1]);
    if (!normalized || !isValidHashtag(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    found.push(normalized);
    if (found.length >= MAX_HASHTAGS_PER_POST) break;
  }
  return found;
}

export interface HashtagToken {
  raw: string;
  normalized: string;
  start: number;
  end: number;
}

/**
 * Localiza tokens #hashtag num texto livre (com posição) — usado tanto pela
 * extração de publicação quanto pela renderização clicável no feed
 * (PostCard), evitando duplicar o regex em dois lugares. Seguro pra
 * importar em Client Components: este arquivo não referencia @prisma/client
 * em runtime, só como tipo (ver lib/community/types.ts).
 */
export function findHashtagTokens(text: string): HashtagToken[] {
  const tokens: HashtagToken[] = [];
  const regex = new RegExp(HASHTAG_TOKEN_REGEX.source, HASHTAG_TOKEN_REGEX.flags);
  for (const match of text.matchAll(regex)) {
    const normalized = normalizeHashtag(match[1]);
    if (!normalized || !isValidHashtag(normalized)) continue;
    const start = match.index ?? 0;
    tokens.push({ raw: match[0], normalized, start, end: start + match[0].length });
  }
  return tokens;
}

/** true se o texto tiver hashtags além do limite (backend rejeita antes de publicar — ver createPostSchema). */
export function exceedsHashtagLimit(text: string | null | undefined): boolean {
  if (!text) return false;
  const distinctSlugs = new Set<string>();
  for (const match of text.matchAll(HASHTAG_TOKEN_REGEX)) {
    const normalized = normalizeHashtag(match[1]);
    if (normalized && isValidHashtag(normalized)) distinctSlugs.add(normalized);
  }
  return distinctSlugs.size > MAX_HASHTAGS_PER_POST;
}

/**
 * Cria/reconcilia as hashtags de um post a partir do texto atual. Idempotente
 * e seguro tanto na criação (sem relações prévias) quanto na edição — remove
 * PostHashtag que sumiram do texto, adiciona as novas, nunca duplica Hashtag
 * (upsert por slug).
 */
export async function syncPostHashtags(db: Db, postId: string, text: string | null | undefined): Promise<void> {
  const slugs = extractHashtags(text);

  if (slugs.length === 0) {
    await db.postHashtag.deleteMany({ where: { postId } });
    return;
  }

  const hashtags = await Promise.all(
    slugs.map((slug) =>
      db.hashtag.upsert({
        where: { slug },
        create: { name: slug, slug },
        update: {},
      })
    )
  );
  const hashtagIds = hashtags.map((h) => h.id);

  await db.postHashtag.deleteMany({ where: { postId, hashtagId: { notIn: hashtagIds } } });
  await Promise.all(
    hashtags.map((h) =>
      db.postHashtag.upsert({
        where: { postId_hashtagId: { postId, hashtagId: h.id } },
        create: { postId, hashtagId: h.id },
        update: {},
      })
    )
  );
}
