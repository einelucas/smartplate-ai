// app/api/community/hashtags/[slug]/route.ts
// Cabeçalho da página de hashtag: contagem de publicações + se o próprio
// usuário já segue. slug sempre normalizado antes de consultar (mesma regra
// de lib/community/hashtags.ts) — "/Corrida" e "/corrida" resolvem igual.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeHashtag } from "@/lib/community/hashtags";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug: rawSlug } = await context.params;
  const slug = normalizeHashtag(rawSlug);

  const hashtag = await prisma.hashtag.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, _count: { select: { posts: true } } },
  });

  if (!hashtag) {
    return NextResponse.json({ hashtag: { slug, name: slug, postCount: 0 }, isFollowing: false });
  }

  const follow = await prisma.userHashtagFollow.findUnique({
    where: { userId_hashtagId: { userId, hashtagId: hashtag.id } },
    select: { userId: true },
  });

  return NextResponse.json({
    hashtag: { slug: hashtag.slug, name: hashtag.name, postCount: hashtag._count.posts },
    isFollowing: !!follow,
  });
}
