// app/api/community/hashtags/suggest/route.ts
// Sugestões simples pro Composer ao digitar "#cor" — busca por slug
// startsWith, sem IA/embeddings. Ordena por quantidade de posts + criação
// mais recente (item 23 do checklist: "se isso for barato", nada complexo).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeHashtag } from "@/lib/community/hashtags";

const MAX_SUGGESTIONS = 8;

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("q") ?? "";
  const normalized = normalizeHashtag(raw);
  if (normalized.length < 1) return NextResponse.json({ hashtags: [] });

  const hashtags = await prisma.hashtag.findMany({
    where: { slug: { startsWith: normalized } },
    select: { slug: true, name: true, _count: { select: { posts: true } } },
    orderBy: [{ posts: { _count: "desc" } }, { createdAt: "desc" }],
    take: MAX_SUGGESTIONS,
  });

  return NextResponse.json({
    hashtags: hashtags.map((h) => ({ slug: h.slug, name: h.name, postCount: h._count.posts })),
  });
}
