// app/api/community/groups/[id]/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireGroupMembership, requireGroupRole } from "@/lib/community/authz";
import { updateGroupSchema } from "@/lib/community/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  try {
    const membership = await requireGroupMembership(prisma, params.id, userId);
    const group = await prisma.communityGroup.findUnique({
      where: { id: params.id },
      include: { _count: { select: { members: true } } },
    });
    if (!group) return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 });

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        inviteCode: group.inviteCode,
        memberCount: group._count.members,
        createdAt: group.createdAt,
        myRole: membership.role,
      },
    });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}

export async function PATCH(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updateGroupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const params = await context.params;
  try {
    await requireGroupRole(prisma, params.id, userId, ["OWNER", "ADMIN"]);
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const updated = await prisma.communityGroup.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
    },
  });

  return NextResponse.json({ group: updated });
}

export async function DELETE(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  const group = await prisma.communityGroup.findUnique({ where: { id: params.id }, select: { ownerUserId: true } });
  if (!group) return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 });
  if (group.ownerUserId !== userId) {
    return NextResponse.json({ error: "Apenas o proprietário pode excluir o grupo" }, { status: 403 });
  }

  await prisma.communityGroup.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
