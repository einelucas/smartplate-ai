// app/api/community/group-invites/[id]/route.ts
// PATCH: aceitar (vira GroupMember) ou recusar um convite de grupo recebido.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { respondGroupInviteSchema } from "@/lib/community/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = respondGroupInviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const params = await context.params;
  const invite = await prisma.groupInvite.findUnique({ where: { id: params.id } });
  if (!invite || invite.invitedUserId !== userId) {
    return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  }
  if (invite.status !== "PENDING") {
    return NextResponse.json({ error: "Convite já respondido" }, { status: 409 });
  }

  if (parsed.data.action === "decline") {
    const updated = await prisma.groupInvite.update({
      where: { id: params.id },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
    return NextResponse.json({ invite: updated });
  }

  // Aceitar: marca o convite e garante a filiação numa única transação —
  // upsert do GroupMember cobre a corrida de já ter entrado pelo inviteCode
  // compartilhável entretanto (nunca duplica, nunca falha por já ser membro).
  const [updatedInvite] = await prisma.$transaction([
    prisma.groupInvite.update({ where: { id: params.id }, data: { status: "ACCEPTED", respondedAt: new Date() } }),
    prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: invite.groupId, userId } },
      create: { groupId: invite.groupId, userId, role: "MEMBER" },
      update: {},
    }),
  ]);

  return NextResponse.json({ invite: updatedInvite, groupId: invite.groupId });
}
