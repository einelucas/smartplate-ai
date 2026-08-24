// app/api/community/posts/[id]/feedback/route.ts
// "Não tenho interesse" — sinal de RECOMENDAÇÃO, distinto de denúncia/
// moderação (ver ContentReport/hiddenAt): só afeta o Feed Para Você do
// próprio usuário, nunca gera denúncia automática nem afeta amizade/bloqueio
// (checklist itens 38/39/40). Idempotente via @@unique([userId,postId,type]).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const feedbackSchema = z.object({ type: z.literal("NOT_INTERESTED") });

export async function POST(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: postId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Tipo de feedback inválido" }, { status: 400 });

  const post = await prisma.communityPost.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });

  await prisma.postFeedFeedback.upsert({
    where: { userId_postId_type: { userId, postId, type: parsed.data.type } },
    create: { userId, postId, type: parsed.data.type },
    update: {},
  });

  return NextResponse.json({ success: true });
}
