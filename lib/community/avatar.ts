// lib/community/avatar.ts
// Fonte única da regra de precedência do avatar — foto personalizada
// enviada no SmartPlate > foto do provedor OAuth (Google/Clerk) > null (o
// componente decide o fallback visual: iniciais/avatar padrão). Nunca
// duplicar esta expressão em componente/rota nenhuma — sempre importar
// daqui (ver auditoria: 10+ pontos de leitura espalhados usavam o campo
// bruto `avatarUrl` antes desta correção).
export interface AvatarSource {
  customAvatarUrl: string | null;
  providerAvatarUrl: string | null;
}

/** Regra única de precedência — reaproveitada em toda leitura de avatar. */
export function resolveAvatarUrl(source: AvatarSource): string | null {
  return source.customAvatarUrl ?? source.providerAvatarUrl ?? null;
}

/**
 * Só aceita URLs realmente hospedadas pelo Clerk (onde o upload via
 * `user.setProfileImage` de fato grava o arquivo) — nunca uma URL arbitrária
 * enviada pelo cliente no corpo da requisição.
 *
 * Aceita qualquer subdomínio de clerk.com/clerk.dev (ex.: img.clerk.com,
 * images.clerk.com) em vez de um hostname único fixo — o subdomínio exato
 * usado pelo CDN de imagens do Clerk não é uma constante documentada
 * publicamente e já causou um falso-negativo aqui (rejeitava uploads
 * legítimos). Ainda assim é seguro: um domínio arbitrário enviado por um
 * cliente malicioso nunca termina em ".clerk.com"/".clerk.dev", que só o
 * próprio Clerk controla.
 */
export function isTrustedClerkImageUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== "https:") return false;
    return hostname === "clerk.com" || hostname.endsWith(".clerk.com") || hostname === "clerk.dev" || hostname.endsWith(".clerk.dev");
  } catch {
    return false;
  }
}

/**
 * Foto do provedor (ex.: Google) a partir das contas externas do Clerk —
 * nunca a foto personalizada. `ExternalAccount.imageUrl` é a cópia do Clerk
 * para aquela conta OAuth especificamente e NUNCA é sobrescrita por
 * `user.setProfileImage()` (que só troca `user.imageUrl`, o "avatar
 * primário" atual) — por isso é a fonte confiável do fallback mesmo depois
 * de um upload personalizado já ter acontecido.
 */
export function pickProviderAvatarUrl(externalAccounts: Array<{ provider: string; imageUrl: string }>): string | null {
  const google = externalAccounts.find((account) => account.provider.toLowerCase().includes("google") && account.imageUrl);
  if (google) return google.imageUrl;
  const anyExternal = externalAccounts.find((account) => account.imageUrl);
  return anyExternal?.imageUrl ?? null;
}

// ─── Identidade pública (userId/username/displayName/avatar) ──────────────
// Fragmento de `select` + serialização reutilizados por toda rota que lista
// autores/participantes/membros em lote (busca, amigos, membros de grupo,
// comentários, feed, ranking) — nunca duplicar o `select` nem devolver os
// campos brutos customAvatarUrl/providerAvatarUrl pro cliente; a resposta
// pública sempre usa a mesma forma { userId, username, displayName, avatarUrl }.

export const publicIdentitySelect = {
  userId: true,
  username: true,
  displayName: true,
  customAvatarUrl: true,
  providerAvatarUrl: true,
} as const;

export interface PublicIdentityRow {
  userId: string;
  username: string | null;
  displayName: string;
  customAvatarUrl: string | null;
  providerAvatarUrl: string | null;
}

export function toPublicIdentity(row: PublicIdentityRow) {
  return {
    userId: row.userId,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: resolveAvatarUrl(row),
  };
}
