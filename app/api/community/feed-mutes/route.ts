// app/api/community/feed-mutes/route.ts
// Ocultar as publicações de um usuário específico do próprio feed, sem
// bloquear (amizade, comentários e reações continuam funcionando normalmente
// — diferente de CommunityBlock, que é bidirecional e remove a amizade).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { muteUserSchema } from "@/lib/community/validation";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mutes = await prisma.userFeedMute.findMany({ where: { muterUserId: userId } });
  const profiles = await prisma.socialProfile.findMany({
    where: { userId: { in: mutes.map((m) => m.mutedUserId) } },
    select: { userId: true, username: true, displayName: true },
  });
  const byId = new Map(profiles.map((p) => [p.userId, p]));

  return NextResponse.json({
    mutes: mutes.map((m) => ({ id: m.id, userId: m.mutedUserId, ...byId.get(m.mutedUserId) })),
  });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = muteUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { targetUserId } = parsed.data;
  if (targetUserId === userId) {
    return NextResponse.json({ error: "Não é possível silenciar a si mesmo" }, { status: 400 });
  }

  await prisma.userFeedMute.upsert({
    where: { muterUserId_mutedUserId: { muterUserId: userId, mutedUserId: targetUserId } },
    create: { muterUserId: userId, mutedUserId: targetUserId },
    update: {},
  });

  return NextResponse.json({ success: true });
}
