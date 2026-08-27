// app/api/community/posts/[id]/route.ts
// PATCH: apenas o autor pode editar o texto do próprio post.
// DELETE: o autor pode remover o próprio post (soft delete); dentro de um
// grupo, OWNER/ADMIN daquele grupo específico também pode remover posts de
// outros membros — governança local (checklist seção 25), nunca substitui a
// moderação central (denúncia + hide continuam em
// POST /api/community/moderation/posts/[id]/hide, com requireModerator).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postTextSchema } from "@/lib/community/validation";
import { exceedsHashtagLimit, syncPostHashtags, MAX_HASHTAGS_PER_POST } from "@/lib/community/hashtags";
import { canDeleteCommunityPost } from "@/lib/community/authz";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  const post = await prisma.communityPost.findUnique({ where: { id: params.id } });
  if (!post || post.deletedAt || post.hiddenAt) {
    return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
  }
  if (post.authorUserId !== userId) return NextResponse.json({ error: "Permissão insuficiente" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = postTextSchema.safeParse(body?.text);
  if (!parsed.success) return NextResponse.json({ error: "Texto inválido" }, { status: 400 });
  if (exceedsHashtagLimit(parsed.data)) {
    return NextResponse.json({ error: `Máximo de ${MAX_HASHTAGS_PER_POST} hashtags por publicação` }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const post = await tx.communityPost.update({ where: { id: params.id }, data: { text: parsed.data } });
    await syncPostHashtags(tx, post.id, parsed.data);
    return post;
  });
  return NextResponse.json({ post: updated });
}

export async function DELETE(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  const post = await prisma.communityPost.findUnique({ where: { id: params.id } });
  if (!post || post.deletedAt) return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });

  if (!(await canDeleteCommunityPost(prisma, post, userId))) {
    return NextResponse.json({ error: "Permissão insuficiente" }, { status: 403 });
  }

  await prisma.communityPost.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
