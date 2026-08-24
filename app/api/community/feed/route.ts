// app/api/community/feed/route.ts
// Feed com paginação. Sem groupId = comunidade geral; com groupId exige que o
// usuário seja membro. Sempre filtra bloqueios em ambas direções.
//
// `tab` só se aplica à comunidade geral (groupId ausente) — grupo continua
// sempre cronológico, sem personalização (ver checklist Parte D item 24):
//   - ausente/"chronological": comportamento histórico, cursor real no id.
//   - "friends": eu + amigos ACCEPTED, cronológico, cursor real no id.
//   - "for-you": heurística determinística (lib/community/feed-ranking.ts),
//     SEM machine learning — busca uma janela limitada de candidatos e
//     ordena/pagina em memória no backend (nunca manda "todos os posts" pro
//     cliente ordenar). Paginação aqui é por offset dentro dessa janela, não
//     por cursor de banco (a ordem não é cronológica pura).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, getBlockedUserIds, requireGroupMembership } from "@/lib/community/authz";
import { cursorPaginationSchema } from "@/lib/community/validation";
import { serializeFeedPosts } from "@/lib/community/feed-items";
import { calculateFeedScore, rankCandidates, FOR_YOU_CANDIDATE_WINDOW, FOR_YOU_DEFAULT_PAGE_SIZE } from "@/lib/community/feed-ranking";

const POST_INCLUDE = {
  reactions: { select: { userId: true, type: true } as const },
  _count: { select: { comments: { where: { deletedAt: null } } } },
} as const;

async function getFriendUserIds(userId: string): Promise<Set<string>> {
  const friendships = await prisma.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ userAId: userId }, { userBId: userId }] },
    select: { userAId: true, userBId: true },
  });
  return new Set(friendships.map((f) => (f.userAId === userId ? f.userBId : f.userAId)));
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId") || undefined;
  const tab = groupId ? undefined : searchParams.get("tab") || undefined;
  const pagination = cursorPaginationSchema.safeParse({
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!pagination.success) return NextResponse.json({ error: "Paginação inválida" }, { status: 400 });
  const { cursor, limit } = pagination.data;

  if (groupId) {
    try {
      await requireGroupMembership(prisma, groupId, userId);
    } catch (error) {
      if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
      throw error;
    }
  }

  const blockedIds = await getBlockedUserIds(prisma, userId);

  if (tab === "for-you") {
    return NextResponse.json(await buildForYouPage(userId, blockedIds, cursor, limit));
  }

  let authorFilter: { notIn: string[] } | { in: string[] };
  if (tab === "friends") {
    const friendIds = await getFriendUserIds(userId);
    const allowed = Array.from(friendIds).concat(userId).filter((id) => !blockedIds.has(id));
    authorFilter = { in: allowed };
  } else {
    authorFilter = { notIn: Array.from(blockedIds) };
  }

  const posts = await prisma.communityPost.findMany({
    where: {
      groupId: groupId ?? null,
      deletedAt: null,
      hiddenAt: null,
      authorUserId: authorFilter,
    },
    include: POST_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;
  const items = await serializeFeedPosts(page, userId);

  return NextResponse.json({ items, nextCursor: hasMore ? page[page.length - 1].id : null });
}

/**
 * Feed Para Você: busca uma janela limitada de posts elegíveis (amigos +
 * hashtags seguidas + mesmos grupos + geral recente — ver checklist item 27),
 * pontua com calculateFeedScore (só sinais sociais, nunca dado privado de
 * saúde/Strava/Premium) e pagina em memória sobre essa janela já pequena.
 * "cursor" aqui é um offset textual dentro da janela ranqueada, não um
 * cursor de banco — documentado no comentário do arquivo.
 */
async function buildForYouPage(userId: string, blockedIds: Set<string>, cursor: string | undefined, limit: number) {
  const offset = cursor ? Number.parseInt(cursor, 10) || 0 : 0;

  const [myGroupIds, friendIds, followedHashtagIds, notInterestedPostIds] = await Promise.all([
    prisma.groupMember.findMany({ where: { userId }, select: { groupId: true } }).then((rows) => rows.map((r) => r.groupId)),
    getFriendUserIds(userId),
    prisma.userHashtagFollow.findMany({ where: { userId }, select: { hashtagId: true } }).then((rows) => new Set(rows.map((r) => r.hashtagId))),
    prisma.postFeedFeedback
      .findMany({ where: { userId, type: "NOT_INTERESTED" }, select: { postId: true } })
      .then((rows) => new Set(rows.map((r) => r.postId))),
  ]);

  // Candidatos: comunidade geral OU meus grupos, recentes, elegíveis — janela
  // limitada (nunca "todos os posts"). Autores previamente interagidos são
  // resolvidos a partir DESTE mesmo conjunto (sem 2ª busca por autor).
  const candidates = await prisma.communityPost.findMany({
    where: {
      OR: [{ groupId: null }, { groupId: { in: myGroupIds } }],
      deletedAt: null,
      hiddenAt: null,
      authorUserId: { notIn: Array.from(blockedIds) },
      id: { notIn: Array.from(notInterestedPostIds) },
    },
    include: {
      ...POST_INCLUDE,
      hashtags: { select: { hashtagId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: FOR_YOU_CANDIDATE_WINDOW,
  });

  const [reactedAuthorRows, commentedAuthorRows] = await Promise.all([
    prisma.communityReaction.findMany({
      where: { userId },
      select: { post: { select: { authorUserId: true } } },
      take: 300,
      orderBy: { createdAt: "desc" },
    }),
    prisma.communityComment.findMany({
      where: { authorUserId: userId, deletedAt: null },
      select: { post: { select: { authorUserId: true } } },
      take: 300,
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const previouslyInteractedAuthorIds = new Set<string>([
    ...reactedAuthorRows.map((r) => r.post.authorUserId),
    ...commentedAuthorRows.map((r) => r.post.authorUserId),
  ]);

  const ranked = rankCandidates(candidates, (post) =>
    calculateFeedScore({
      relationship: {
        isFriend: friendIds.has(post.authorUserId),
        sameGroup: post.groupId !== null && myGroupIds.includes(post.groupId),
      },
      interests: {
        matchedFollowedHashtags: post.hashtags.filter((h) => followedHashtagIds.has(h.hashtagId)).length,
      },
      engagement: {
        previousAuthorInteraction: previouslyInteractedAuthorIds.has(post.authorUserId),
        reactionCount: post.reactions.length,
        commentCount: post._count.comments,
      },
      freshness: { createdAt: post.createdAt },
      feedback: { excluded: post.authorUserId !== userId && notInterestedPostIds.has(post.id) },
    })
  );

  const pageSize = limit || FOR_YOU_DEFAULT_PAGE_SIZE;
  const page = ranked.slice(offset, offset + pageSize);
  const items = await serializeFeedPosts(page, userId);
  const nextOffset = offset + page.length;
  const nextCursor = nextOffset < ranked.length ? String(nextOffset) : null;

  return { items, nextCursor };
}
