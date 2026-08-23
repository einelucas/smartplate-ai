// app/api/community/groups/join/route.ts
// Entrar em um grupo via código de convite. Sempre requer autenticação —
// apenas a landing pública /community/invite/[code] e o preview de
// GET /api/community/groups/invite/[code] são acessíveis sem login.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { joinGroupSchema } from "@/lib/community/validation";
import { checkAndUnlockAchievements } from "@/lib/community/gamification";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = joinGroupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Código de convite inválido" }, { status: 400 });

  const group = await prisma.communityGroup.findUnique({
    where: { inviteCode: parsed.data.inviteCode.toUpperCase() },
  });
  if (!group) return NextResponse.json({ error: "Código de convite não encontrado" }, { status: 404 });

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId } },
  });
  if (existing) return NextResponse.json({ group, alreadyMember: true });

  await prisma.$transaction(async (tx) => {
    const membershipCountBefore = await tx.groupMember.count({ where: { userId } });
    await tx.groupMember.create({ data: { groupId: group.id, userId, role: "MEMBER" } });
    await checkAndUnlockAchievements(tx, userId, { firstGroupJoined: membershipCountBefore === 0 });
  });

  return NextResponse.json({ group, alreadyMember: false }, { status: 201 });
}
