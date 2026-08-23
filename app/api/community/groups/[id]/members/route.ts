// app/api/community/groups/[id]/members/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireGroupMembership } from "@/lib/community/authz";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  try {
    await requireGroupMembership(prisma, params.id, userId);
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const members = await prisma.groupMember.findMany({
    where: { groupId: params.id },
    orderBy: { joinedAt: "asc" },
  });

  const profiles = await prisma.socialProfile.findMany({
    where: { userId: { in: members.map((m) => m.userId) } },
    select: { userId: true, username: true, displayName: true, avatarUrl: true },
  });
  const byId = new Map(profiles.map((p) => [p.userId, p]));

  return NextResponse.json({
    members: members.map((m) => ({
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      ...byId.get(m.userId),
    })),
  });
}
