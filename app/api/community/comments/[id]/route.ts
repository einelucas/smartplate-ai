// app/api/community/comments/[id]/route.ts
// Autor remove o próprio comentário; MODERATOR/ADMIN podem remover qualquer um.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProfileRole } from "@/lib/community/authz";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  const comment = await prisma.communityComment.findUnique({ where: { id: params.id } });
  if (!comment || comment.deletedAt) return NextResponse.json({ error: "Comentário não encontrado" }, { status: 404 });

  if (comment.authorUserId !== userId) {
    const role = await getProfileRole(userId);
    if (role !== "MODERATOR" && role !== "ADMIN") {
      return NextResponse.json({ error: "Permissão insuficiente" }, { status: 403 });
    }
  }

  await prisma.communityComment.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
