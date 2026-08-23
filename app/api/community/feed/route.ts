// app/api/community/feed/route.ts
// Feed com paginação por cursor. Sem groupId = comunidade geral; com groupId
// exige que o usuário seja membro. Sempre filtra bloqueios em ambas direções.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, getBlockedUserIds, requireGroupMembership } from "@/lib/community/authz";
import { cursorPaginationSchema } from "@/lib/community/validation";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId") || undefined;
  const pagination = cursorPaginationSchema.safeParse({
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!pagination.success) return NextResponse.json({ error: "Paginação inválida" }, { status: 400 });

  if (groupId) {
    try {
      await requireGroupMembership(prisma, groupId, userId);
    } catch (error) {
      if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
      throw error;
    }
  }

  const blockedIds = await getBlockedUserIds(prisma, userId);
  const { cursor, limit } = pagination.data;

  const posts = await prisma.communityPost.findMany({
    where: {
      groupId: groupId ?? null,
      deletedAt: null,
      hiddenAt: null,
      authorUserId: { notIn: Array.from(blockedIds) },
    },
    include: {
      reactions: { select: { userId: true, type: true } },
      _count: { select: { comments: { where: { deletedAt: null } } } },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;

  const authorIds = Array.from(new Set(page.map((p) => p.authorUserId)));
  const profiles = await prisma.socialProfile.findMany({
    where: { userId: { in: authorIds } },
    select: { userId: true, username: true, displayName: true, avatarUrl: true },
  });
  const byId = new Map(profiles.map((p) => [p.userId, p]));

  const items = page.map((post) => {
    const reactionCounts: Record<string, number> = {};
    const myReactions: string[] = [];
    for (const reaction of post.reactions) {
      reactionCounts[reaction.type] = (reactionCounts[reaction.type] ?? 0) + 1;
      if (reaction.userId === userId) myReactions.push(reaction.type);
    }
    return {
      id: post.id,
      type: post.type,
      text: post.text,
      metadata: post.metadata,
      groupId: post.groupId,
      createdAt: post.createdAt,
      author: byId.get(post.authorUserId) ?? {
        userId: post.authorUserId,
        username: null,
        displayName: "Usuário SmartPlate",
        avatarUrl: null,
      },
      isMine: post.authorUserId === userId,
      reactionCounts,
      myReactions,
      commentCount: post._count.comments,
    };
  });

  return NextResponse.json({ items, nextCursor: hasMore ? page[page.length - 1].id : null });
}
