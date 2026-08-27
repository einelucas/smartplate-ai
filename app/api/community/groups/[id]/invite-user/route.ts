// app/api/community/groups/[id]/invite-user/route.ts
// Convite direcionado a um usuário específico — diferente do inviteCode
// compartilhável (que qualquer um com o link pode usar). Só OWNER/ADMIN.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireGroupRole } from "@/lib/community/authz";
import { inviteUserToGroupSchema } from "@/lib/community/validation";
import { notifyIfEnabled } from "@/lib/community/notify";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  try {
    await requireGroupRole(prisma, params.id, userId, ["OWNER", "ADMIN"]);
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = inviteUserToGroupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { targetUserId } = parsed.data;

  const [group, targetSocial, existingMembership, existingPending] = await Promise.all([
    prisma.communityGroup.findUnique({ where: { id: params.id }, select: { name: true } }),
    prisma.socialProfile.findUnique({ where: { userId: targetUserId }, select: { userId: true } }),
    prisma.groupMember.findUnique({ where: { groupId_userId: { groupId: params.id, userId: targetUserId } } }),
    prisma.groupInvite.findUnique({
      where: { groupId_invitedUserId_status: { groupId: params.id, invitedUserId: targetUserId, status: "PENDING" } },
    }),
  ]);

  if (!group) return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 });
  if (!targetSocial) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  if (existingMembership) return NextResponse.json({ error: "Este usuário já é membro do grupo" }, { status: 409 });
  if (existingPending) return NextResponse.json({ error: "Já existe um convite pendente para este usuário" }, { status: 409 });

  const invite = await prisma.groupInvite.create({
    data: { groupId: params.id, invitedUserId: targetUserId, invitedByUserId: userId },
  });

  await notifyIfEnabled(targetUserId, "notifySocial", {
    type: "GROUP_INVITE_RECEIVED",
    title: "📨 Convite para grupo",
    body: `Você foi convidado(a) para o grupo "${group.name}".`,
    data: { groupInviteId: invite.id, groupId: params.id },
  });

  return NextResponse.json({ invite }, { status: 201 });
}
