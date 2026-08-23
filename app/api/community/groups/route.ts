// app/api/community/groups/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createGroupSchema } from "@/lib/community/validation";
import { checkAndUnlockAchievements } from "@/lib/community/gamification";
import { generateUniqueInviteCode } from "@/lib/community/invite-code";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: { group: { include: { _count: { select: { members: true } } } } },
    orderBy: { joinedAt: "desc" },
  });

  return NextResponse.json({
    groups: memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      description: m.group.description,
      memberCount: m.group._count.members,
      role: m.role,
      inviteCode: m.group.inviteCode,
      createdAt: m.group.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const inviteCode = await generateUniqueInviteCode();

  const group = await prisma.$transaction(async (tx) => {
    const membershipCountBefore = await tx.groupMember.count({ where: { userId } });

    const created = await tx.communityGroup.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        ownerUserId: userId,
        inviteCode,
        members: { create: { userId, role: "OWNER" } },
      },
    });

    await checkAndUnlockAchievements(tx, userId, { firstGroupJoined: membershipCountBefore === 0 });

    return created;
  });

  return NextResponse.json({ group }, { status: 201 });
}
