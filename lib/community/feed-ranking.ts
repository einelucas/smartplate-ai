// lib/community/feed-ranking.ts
// Score central do Feed Para Você — heurística determinística e documentada,
// SEM machine learning / embeddings / modelo externo. Único lugar que
// calcula pontuação de ranking (nunca espalhar esse cálculo pela API).
// calculateFeedScore() foi desenhada pra aceitar novos sinais no futuro
// (ex.: um novo campo em `engagement` ou `interests`) sem precisar reescrever
// as rotas que a chamam.
//
// PROIBIDO usar como sinal aqui: peso, altura, targetWeight, birthDate,
// dados de dieta privados, alergias, fotos de progresso, dados Strava
// privados, dados médicos, Premium/Free. Só sinais sociais: amizade, grupo,
// hashtag seguida, post, reação, comentário, feedback do feed, recência.

export const FEED_SCORE_WEIGHTS = {
  FRIEND_AUTHOR: 50,
  FOLLOWED_HASHTAG_MATCH: 30,
  // Teto de quantas hashtags seguidas do MESMO post contam — evita que um
  // post com muitas hashtags seguidas descontrole o score (item 45).
  MAX_COUNTED_HASHTAG_MATCHES: 3,
  SAME_GROUP: 20,
  PREVIOUS_AUTHOR_INTERACTION: 15,
  RECENT_UNDER_24H: 10,
  RECENT_UNDER_72H: 5,
  ENGAGEMENT_PER_REACTION: 1,
  ENGAGEMENT_PER_COMMENT: 1.5,
  ENGAGEMENT_CAP: 10,
} as const;

export interface FeedScoreInput {
  relationship: { isFriend: boolean; sameGroup: boolean };
  interests: { matchedFollowedHashtags: number };
  engagement: { previousAuthorInteraction: boolean; reactionCount: number; commentCount: number };
  freshness: { createdAt: Date };
  feedback: { excluded: boolean };
}

/** Pontuação de um único post candidato. Retorna -Infinity para excluir (feedback "não tenho interesse", autor bloqueado já filtrado antes). */
export function calculateFeedScore(input: FeedScoreInput): number {
  if (input.feedback.excluded) return Number.NEGATIVE_INFINITY;

  let score = 0;

  if (input.relationship.isFriend) score += FEED_SCORE_WEIGHTS.FRIEND_AUTHOR;
  if (input.relationship.sameGroup) score += FEED_SCORE_WEIGHTS.SAME_GROUP;

  score +=
    Math.min(input.interests.matchedFollowedHashtags, FEED_SCORE_WEIGHTS.MAX_COUNTED_HASHTAG_MATCHES) *
    FEED_SCORE_WEIGHTS.FOLLOWED_HASHTAG_MATCH;

  if (input.engagement.previousAuthorInteraction) score += FEED_SCORE_WEIGHTS.PREVIOUS_AUTHOR_INTERACTION;

  const engagementScore = Math.min(
    input.engagement.reactionCount * FEED_SCORE_WEIGHTS.ENGAGEMENT_PER_REACTION +
      input.engagement.commentCount * FEED_SCORE_WEIGHTS.ENGAGEMENT_PER_COMMENT,
    FEED_SCORE_WEIGHTS.ENGAGEMENT_CAP
  );
  score += engagementScore;

  // Frescor em degraus simples (não decaimento contínuo) — só o suficiente
  // pra impedir que posts antigos com muito engajamento dominem pra sempre.
  const hoursSincePost = (Date.now() - input.freshness.createdAt.getTime()) / 3_600_000;
  if (hoursSincePost < 24) score += FEED_SCORE_WEIGHTS.RECENT_UNDER_24H;
  else if (hoursSincePost < 72) score += FEED_SCORE_WEIGHTS.RECENT_UNDER_72H;

  return score;
}

/**
 * Regra simples de diversidade: evita mais de `maxConsecutive` posts
 * seguidos do mesmo autor quando há candidato diferente disponível pra
 * intercalar. Não reordena por popularidade — só troca a posição do próximo
 * item quando o autor se repetiria demais, preservando a ordem de score do
 * restante da lista.
 */
export function applyDiversity<T extends { authorUserId: string }>(ranked: T[], maxConsecutive = 2): T[] {
  const result: T[] = [];
  const pending = [...ranked];

  while (pending.length > 0) {
    const tail = result.slice(-maxConsecutive).map((p) => p.authorUserId);
    const wouldRepeat = tail.length === maxConsecutive && tail.every((authorId) => authorId === tail[0]);

    let pickIndex = 0;
    if (wouldRepeat) {
      const alternative = pending.findIndex((p) => p.authorUserId !== tail[0]);
      if (alternative !== -1) pickIndex = alternative;
    }

    result.push(pending[pickIndex]);
    pending.splice(pickIndex, 1);
  }

  return result;
}

/** Pontua, ordena (score desc, empate por mais recente) e aplica diversidade sobre uma janela já limitada de candidatos (ver FOR_YOU_CANDIDATE_WINDOW). */
export function rankCandidates<T extends { authorUserId: string; createdAt: Date }>(
  candidates: T[],
  scoreOf: (candidate: T) => number
): T[] {
  const scored = candidates
    .map((candidate) => ({ candidate, score: scoreOf(candidate) }))
    .filter((entry) => Number.isFinite(entry.score));

  scored.sort((a, b) => b.score - a.score || b.candidate.createdAt.getTime() - a.candidate.createdAt.getTime());

  return applyDiversity(scored.map((entry) => entry.candidate));
}

// Janela limitada de candidatos buscados do banco (nunca "todos os posts") —
// o ranking roda em memória sobre esse conjunto já pequeno, no backend.
export const FOR_YOU_CANDIDATE_WINDOW = 150;
export const FOR_YOU_DEFAULT_PAGE_SIZE = 20;
