// app/api/community/groups/[id]/leave/route.ts
// OWNER só pode sair transferindo a propriedade (body: { transferToUserId }).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGroupMembership } from "@/lib/community/authz";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  const membership = await getGroupMembership(prisma, params.id, userId);
  if (!membership) return NextResponse.json({ error: "Você não é membro deste grupo" }, { status: 403 });

  if (membership.role !== "OWNER") {
    await prisma.groupMember.delete({ where: { groupId_userId: { groupId: params.id, userId } } });
    return NextResponse.json({ success: true });
  }

  const body = await request.json().catch(() => null);
  const transferToUserId: string | undefined = body?.transferToUserId;
  if (!transferToUserId) {
    return NextResponse.json(
      { error: "Transfira a propriedade (transferToUserId) ou exclua o grupo antes de sair" },
      { status: 400 }
    );
  }

  const target = await getGroupMembership(prisma, params.id, transferToUserId);
  if (!target) return NextResponse.json({ error: "Novo proprietário precisa ser membro do grupo" }, { status: 400 });
  if (transferToUserId === userId) {
    return NextResponse.json({ error: "Escolha outro membro para receber a propriedade" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.communityGroup.update({ where: { id: params.id }, data: { ownerUserId: transferToUserId } });
    await tx.groupMember.update({
      where: { groupId_userId: { groupId: params.id, userId: transferToUserId } },
      data: { role: "OWNER" },
    });
    await tx.groupMember.delete({ where: { groupId_userId: { groupId: params.id, userId } } });
  });

  return NextResponse.json({ success: true });
}
