// app/api/community/posts/[id]/image/route.ts
// Proxy autenticado da imagem de um post (TEXT, ACTIVITY ou EXTERNAL_SHARE —
// qualquer tipo que possa carregar uma foto em metadata.imageUrl). Só serve
// para quem pode ver o post (mesma regra do feed: post não excluído/oculto,
// membro do grupo se for post de grupo, sem bloqueio entre autor e quem pede).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isBlockedEitherWay, requireGroupMembership } from "@/lib/community/authz";
import { streamPrivateImage } from "@/lib/storage/blob";
import { IMAGE_CAPABLE_TYPES } from "@/lib/community/feed-items";

type Params = { params: Promise<{ id: string }> };
type PostImageMetadata = { imageUrl?: string | null };

export async function GET(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const params = await context.params;
  const post = await prisma.communityPost.findUnique({ where: { id: params.id } });
  if (!post || post.deletedAt || post.hiddenAt || !IMAGE_CAPABLE_TYPES.has(post.type)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 404 });
  }

  if (post.groupId) {
    try {
      await requireGroupMembership(prisma, post.groupId, userId);
    } catch {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }
  } else if (await isBlockedEitherWay(prisma, userId, post.authorUserId)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const imageUrl = (post.metadata as PostImageMetadata | null)?.imageUrl;
  if (!imageUrl) return NextResponse.json({ error: "Imagem não encontrada." }, { status: 404 });

  const result = await streamPrivateImage(imageUrl);
  if (!result) return NextResponse.json({ error: "Imagem não encontrada." }, { status: 404 });

  return new NextResponse(result.stream, {
    headers: { "Content-Type": result.contentType, "Cache-Control": "private, max-age=300" },
  });
}
