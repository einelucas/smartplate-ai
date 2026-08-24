// app/api/community/hashtags/[slug]/follow/route.ts
// Seguir/deixar de seguir uma hashtag — único jeito de registrar interesse
// EXPLÍCITO (usar a hashtag num post nunca segue automaticamente, ver
// checklist item 46). Cria a Hashtag no upsert se ainda não existir (permite
// seguir uma hashtag que ainda não tem post nenhum).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidHashtag, normalizeHashtag } from "@/lib/community/hashtags";

type Params = { params: Promise<{ slug: string }> };

export async function POST(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug: rawSlug } = await context.params;
  const slug = normalizeHashtag(rawSlug);
  if (!isValidHashtag(slug)) return NextResponse.json({ error: "Hashtag inválida" }, { status: 400 });

  const hashtag = await prisma.hashtag.upsert({
    where: { slug },
    create: { name: slug, slug },
    update: {},
  });

  await prisma.userHashtagFollow.upsert({
    where: { userId_hashtagId: { userId, hashtagId: hashtag.id } },
    create: { userId, hashtagId: hashtag.id },
    update: {},
  });

  return NextResponse.json({ success: true, isFollowing: true });
}

export async function DELETE(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug: rawSlug } = await context.params;
  const slug = normalizeHashtag(rawSlug);

  const hashtag = await prisma.hashtag.findUnique({ where: { slug }, select: { id: true } });
  if (hashtag) {
    await prisma.userHashtagFollow.deleteMany({ where: { userId, hashtagId: hashtag.id } });
  }

  return NextResponse.json({ success: true, isFollowing: false });
}
