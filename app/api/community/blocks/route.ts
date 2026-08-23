// app/api/community/blocks/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeFriendPair } from "@/lib/community/authz";
import { blockUserSchema } from "@/lib/community/validation";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const blocks = await prisma.communityBlock.findMany({ where: { blockerUserId: userId } });
  const profiles = await prisma.socialProfile.findMany({
    where: { userId: { in: blocks.map((b) => b.blockedUserId) } },
    select: { userId: true, username: true, displayName: true },
  });
  const byId = new Map(profiles.map((p) => [p.userId, p]));

  return NextResponse.json({
    blocks: blocks.map((b) => ({ id: b.id, userId: b.blockedUserId, ...byId.get(b.blockedUserId) })),
  });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = blockUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { targetUserId } = parsed.data;
  if (targetUserId === userId) {
    return NextResponse.json({ error: "Não é possível bloquear a si mesmo" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.communityBlock.upsert({
      where: { blockerUserId_blockedUserId: { blockerUserId: userId, blockedUserId: targetUserId } },
      create: { blockerUserId: userId, blockedUserId: targetUserId },
      update: {},
    });

    const pair = normalizeFriendPair(userId, targetUserId);
    await tx.friendship.deleteMany({ where: { userAId: pair.userAId, userBId: pair.userBId } });
  });

  return NextResponse.json({ success: true });
}
