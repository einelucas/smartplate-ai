// app/api/community/posts/[id]/reactions/route.ts
// Toggle de reação: no máximo uma reação de cada tipo por usuário/post.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireGroupMembership } from "@/lib/community/authz";
import { reactionTypeSchema } from "@/lib/community/validation";
import { notifyIfEnabled } from "@/lib/community/notify";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = reactionTypeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Tipo de reação inválido" }, { status: 400 });

  const params = await context.params;
  const post = await prisma.communityPost.findUnique({
    where: { id: params.id },
    select: { id: true, deletedAt: true, hiddenAt: true, groupId: true, authorUserId: true },
  });
  if (!post || post.deletedAt || post.hiddenAt) {
    return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
  }

  if (post.groupId) {
    try {
      await requireGroupMembership(prisma, post.groupId, userId);
    } catch (error) {
      if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
      throw error;
    }
  }

  const { type } = parsed.data;
  const existing = await prisma.communityReaction.findUnique({
    where: { postId_userId_type: { postId: params.id, userId, type } },
  });

  if (existing) {
    await prisma.communityReaction.delete({ where: { id: existing.id } });
    return NextResponse.json({ reacted: false });
  }

  await prisma.communityReaction.create({ data: { postId: params.id, userId, type } });

  if (post.authorUserId !== userId) {
    await notifyIfEnabled(post.authorUserId, "notifySocial", {
      type: "REACTION_RECEIVED",
      title: "❤️ Nova reação",
      body: "Alguém reagiu à sua publicação.",
      data: { postId: post.id },
    });
  }

  return NextResponse.json({ reacted: true });
}
