// app/api/community/friends/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeFriendPair, isBlockedEitherWay } from "@/lib/community/authz";
import { sendFriendRequestSchema } from "@/lib/community/validation";

async function toDisplayMap(userIds: string[]) {
  if (userIds.length === 0) return new Map();
  const profiles = await prisma.socialProfile.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, username: true, displayName: true, avatarUrl: true },
  });
  return new Map(profiles.map((p) => [p.userId, p]));
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    orderBy: { createdAt: "desc" },
  });

  const otherIds = rows.map((row) => (row.userAId === userId ? row.userBId : row.userAId));
  const displayMap = await toDisplayMap(otherIds);

  const accepted: unknown[] = [];
  const incomingPending: unknown[] = [];
  const outgoingPending: unknown[] = [];

  for (const row of rows) {
    const otherId = row.userAId === userId ? row.userBId : row.userAId;
    const display = displayMap.get(otherId);
    const entry = { friendshipId: row.id, userId: otherId, ...display };
    if (row.status === "ACCEPTED") accepted.push(entry);
    else if (row.requesterId === userId) outgoingPending.push(entry);
    else incomingPending.push(entry);
  }

  return NextResponse.json({ accepted, incomingPending, outgoingPending });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = sendFriendRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { targetUserId } = parsed.data;
  if (targetUserId === userId) {
    return NextResponse.json({ error: "Não é possível adicionar a si mesmo" }, { status: 400 });
  }

  const targetSocial = await prisma.socialProfile.findUnique({ where: { userId: targetUserId } });
  if (!targetSocial) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  if (await isBlockedEitherWay(prisma, userId, targetUserId)) {
    return NextResponse.json({ error: "Não é possível enviar solicitação para este usuário" }, { status: 403 });
  }

  const pair = normalizeFriendPair(userId, targetUserId);
  const existing = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId: pair.userAId, userBId: pair.userBId } },
  });
  if (existing) {
    return NextResponse.json(
      { error: existing.status === "ACCEPTED" ? "Vocês já são amigos" : "Solicitação já existe" },
      { status: 409 }
    );
  }

  const friendship = await prisma.friendship.create({
    data: { ...pair, requesterId: userId, status: "PENDING" },
  });

  return NextResponse.json({ friendship }, { status: 201 });
}
