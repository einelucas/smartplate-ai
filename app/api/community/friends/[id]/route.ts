// app/api/community/friends/[id]/route.ts
// PATCH: aceitar/recusar solicitação recebida. DELETE: cancelar (solicitante,
// enquanto PENDING) ou remover amizade (ACCEPTED, qualquer um dos dois lados).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { friendActionSchema } from "@/lib/community/validation";
import { notifyIfEnabled } from "@/lib/community/notify";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = friendActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const params = await context.params;
  const friendship = await prisma.friendship.findUnique({ where: { id: params.id } });
  if (!friendship || (friendship.userAId !== userId && friendship.userBId !== userId)) {
    return NextResponse.json({ error: "Solicitação não encontrada" }, { status: 404 });
  }
  if (friendship.status !== "PENDING") {
    return NextResponse.json({ error: "Solicitação já respondida" }, { status: 409 });
  }
  if (friendship.requesterId === userId) {
    return NextResponse.json({ error: "Você não pode responder sua própria solicitação" }, { status: 403 });
  }

  if (parsed.data.action === "accept") {
    const updated = await prisma.friendship.update({ where: { id: params.id }, data: { status: "ACCEPTED" } });
    await notifyIfEnabled(friendship.requesterId, "notifySocial", {
      type: "FRIEND_REQUEST_ACCEPTED",
      title: "🎉 Solicitação aceita",
      body: "Sua solicitação de amizade foi aceita.",
      data: { friendshipId: updated.id },
    });
    return NextResponse.json({ friendship: updated });
  }

  await prisma.friendship.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  const friendship = await prisma.friendship.findUnique({ where: { id: params.id } });
  if (!friendship || (friendship.userAId !== userId && friendship.userBId !== userId)) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  if (friendship.status === "PENDING" && friendship.requesterId !== userId) {
    return NextResponse.json({ error: "Apenas quem solicitou pode cancelar" }, { status: 403 });
  }

  await prisma.friendship.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
