// app/api/community/challenges/[id]/route.ts
// DELETE: GROUP -> OWNER/ADMIN do grupo; GLOBAL -> MODERATOR/ADMIN do sistema.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireGroupRole, requireModerator } from "@/lib/community/authz";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  const challenge = await prisma.challenge.findUnique({ where: { id: params.id } });
  if (!challenge) return NextResponse.json({ error: "Desafio não encontrado" }, { status: 404 });

  try {
    if (challenge.scope === "GROUP" && challenge.groupId) {
      await requireGroupRole(prisma, challenge.groupId, userId, ["OWNER", "ADMIN"]);
    } else {
      await requireModerator(userId);
    }
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  await prisma.challenge.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
