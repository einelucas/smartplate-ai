// app/api/community/groups/invite/[code]/route.ts
// PÚBLICA (ver middleware.ts) — preview somente leitura para a landing page
// de convite, acessível por usuários deslogados. Nunca expõe membros/feed.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ code: string }> };

export async function GET(_request: Request, context: Params) {
  const params = await context.params;
  const group = await prisma.communityGroup.findUnique({
    where: { inviteCode: params.code.toUpperCase() },
    include: { _count: { select: { members: true } } },
  });

  if (!group) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });

  return NextResponse.json({
    name: group.name,
    description: group.description,
    memberCount: group._count.members,
  });
}
