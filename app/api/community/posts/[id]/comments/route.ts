// app/api/community/posts/[id]/comments/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireGroupMembership } from "@/lib/community/authz";
import { commentTextSchema, cursorPaginationSchema } from "@/lib/community/validation";
import { publicIdentitySelect, toPublicIdentity } from "@/lib/community/avatar";
import { RATE_LIMITS, RateLimitError, checkRateLimit, windowStart } from "@/lib/community/rate-limit";
import { notifyIfEnabled } from "@/lib/community/notify";

type Params = { params: Promise<{ id: string }> };

async function assertPostVisible(postId: string, userId: string) {
  const post = await prisma.communityPost.findUnique({ where: { id: postId } });
  if (!post || post.deletedAt || post.hiddenAt) throw new AuthzError("Post não encontrado", 404);
  if (post.groupId) await requireGroupMembership(prisma, post.groupId, userId);
  return post;
}

export async function GET(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  try {
    await assertPostVisible(params.id, userId);
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const pagination = cursorPaginationSchema.safeParse({
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!pagination.success) return NextResponse.json({ error: "Paginação inválida" }, { status: 400 });
  const { cursor, limit } = pagination.data;

  const comments = await prisma.communityComment.findMany({
    where: { postId: params.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = comments.length > limit;
  const page = hasMore ? comments.slice(0, limit) : comments;

  const authorIds = Array.from(new Set(page.map((c) => c.authorUserId)));
  const profiles = await prisma.socialProfile.findMany({
    where: { userId: { in: authorIds } },
    select: publicIdentitySelect,
  });
  const byId = new Map(profiles.map((p) => [p.userId, toPublicIdentity(p)]));

  return NextResponse.json({
    items: page.map((c) => ({
      id: c.id,
      text: c.text,
      createdAt: c.createdAt,
      author: byId.get(c.authorUserId) ?? { userId: c.authorUserId, displayName: "Usuário SmartPlate" },
      isMine: c.authorUserId === userId,
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
}

export async function POST(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const socialProfile = await prisma.socialProfile.findUnique({ where: { userId } });
  if (!socialProfile?.termsAcceptedAt) {
    return NextResponse.json({ error: "É necessário aceitar as Regras da Comunidade antes de comentar" }, { status: 403 });
  }

  try {
    await checkRateLimit(
      () => prisma.communityComment.count({ where: { authorUserId: userId, createdAt: { gte: windowStart(RATE_LIMITS.createComment.windowMinutes) } } }),
      RATE_LIMITS.createComment
    );
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const params = await context.params;
  let post;
  try {
    post = await assertPostVisible(params.id, userId);
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = commentTextSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Comentário inválido" }, { status: 400 });

  const comment = await prisma.communityComment.create({
    data: { postId: params.id, authorUserId: userId, text: parsed.data.text },
  });

  if (post.authorUserId !== userId) {
    await notifyIfEnabled(post.authorUserId, "notifySocial", {
      type: "COMMENT_RECEIVED",
      title: "💬 Novo comentário",
      body: "Alguém comentou na sua publicação.",
      data: { postId: post.id, commentId: comment.id },
      link: "/community",
    });
  }

  return NextResponse.json({ comment }, { status: 201 });
}
