// app/api/community/content-mutes/route.ts
// Silenciar um tipo de post (PostType) no próprio feed — nunca afeta outros
// usuários, nunca bloqueia nada além da exibição no feed.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mutePostTypeSchema } from "@/lib/community/validation";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mutes = await prisma.userContentMute.findMany({ where: { userId }, select: { postType: true } });
  return NextResponse.json({ mutedTypes: mutes.map((m) => m.postType) });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = mutePostTypeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Tipo de conteúdo inválido" }, { status: 400 });

  await prisma.userContentMute.upsert({
    where: { userId_postType: { userId, postType: parsed.data.postType } },
    create: { userId, postType: parsed.data.postType },
    update: {},
  });

  return NextResponse.json({ success: true });
}
