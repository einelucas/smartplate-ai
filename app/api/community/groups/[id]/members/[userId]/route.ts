// app/api/community/groups/[id]/members/[userId]/route.ts
// PATCH: OWNER altera role de um membro (ADMIN/MEMBER — nunca OWNER aqui).
// DELETE: auto-saída (bloqueada para OWNER) ou remoção por OWNER/ADMIN.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, getGroupMembership, requireGroupRole } from "@/lib/community/authz";
import { changeMemberRoleSchema } from "@/lib/community/validation";

type Params = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = changeMemberRoleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const params = await context.params;
  try {
    await requireGroupRole(prisma, params.id, userId, ["OWNER"]);
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const targetMembership = await getGroupMembership(prisma, params.id, params.userId);
  if (!targetMembership) return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
  if (targetMembership.role === "OWNER") {
    return NextResponse.json({ error: "Use a transferência de propriedade para alterar o dono" }, { status: 400 });
  }

  const updated = await prisma.groupMember.update({
    where: { groupId_userId: { groupId: params.id, userId: params.userId } },
    data: { role: parsed.data.role },
  });

  return NextResponse.json({ member: updated });
}

export async function DELETE(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  const callerMembership = await getGroupMembership(prisma, params.id, userId);
  if (!callerMembership) return NextResponse.json({ error: "Você não é membro deste grupo" }, { status: 403 });

  const isSelfLeave = params.userId === userId;

  if (isSelfLeave) {
    if (callerMembership.role === "OWNER") {
      return NextResponse.json(
        { error: "Transfira a propriedade ou exclua o grupo antes de sair" },
        { status: 400 }
      );
    }
  } else {
    if (callerMembership.role !== "OWNER" && callerMembership.role !== "ADMIN") {
      return NextResponse.json({ error: "Permissão insuficiente" }, { status: 403 });
    }
    const targetMembership = await getGroupMembership(prisma, params.id, params.userId);
    if (!targetMembership) return NextResponse.json({ error: "Membro não encontrado" }, { status: 404 });
    if (targetMembership.role === "OWNER") {
      return NextResponse.json({ error: "Não é possível remover o proprietário" }, { status: 400 });
    }
    if (targetMembership.role === "ADMIN" && callerMembership.role !== "OWNER") {
      return NextResponse.json({ error: "Apenas o proprietário pode remover administradores" }, { status: 403 });
    }
  }

  await prisma.groupMember.delete({ where: { groupId_userId: { groupId: params.id, userId: params.userId } } });
  return NextResponse.json({ success: true });
}
