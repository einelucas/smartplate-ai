// app/api/community/hashtags/[slug]/posts/route.ts
// Posts públicos elegíveis com uma hashtag — mesma regra de visibilidade do
// feed geral (sem grupo, sem excluído/oculto, sem bloqueio) e mesmo shape de
// item (lib/community/feed-items.ts) pra reusar PostCard sem adaptação.
// Ordenação: recentes (item 50 do checklist — nada de "em destaque" ainda).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBlockedUserIds } from "@/lib/community/authz";
import { cursorPaginationSchema } from "@/lib/community/validation";
import { normalizeHashtag } from "@/lib/community/hashtags";
import { serializeFeedPosts } from "@/lib/community/feed-items";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug: rawSlug } = await context.params;
  const slug = normalizeHashtag(rawSlug);

  const { searchParams } = new URL(request.url);
  const pagination = cursorPaginationSchema.safeParse({
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!pagination.success) return NextResponse.json({ error: "Paginação inválida" }, { status: 400 });
  const { cursor, limit } = pagination.data;

  const hashtag = await prisma.hashtag.findUnique({ where: { slug }, select: { id: true } });
  if (!hashtag) return NextResponse.json({ items: [], nextCursor: null });

  const blockedIds = await getBlockedUserIds(prisma, userId);

  const posts = await prisma.communityPost.findMany({
    where: {
      groupId: null,
      deletedAt: null,
      hiddenAt: null,
      authorUserId: { notIn: Array.from(blockedIds) },
      hashtags: { some: { hashtagId: hashtag.id } },
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
  const items = await serializeFeedPosts(page, userId);

  return NextResponse.json({ items, nextCursor: hasMore ? page[page.length - 1].id : null });
}
