// app/api/community/challenges/completed/route.ts
// Lista os desafios que o próprio usuário já concluiu (global ou de grupo),
// pra alimentar o ChallengePickerModal do Composer — "compartilhar desafio"
// só pode anexar algo que realmente aconteceu (checklist seção 24: "criar
// posts reais de desafio antes de liberar filtro"). Nunca aceita nada do
// cliente além da paginação; POST /api/community/posts revalida tudo de
// novo a partir do banco antes de criar o post.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const participations = await prisma.challengeParticipant.findMany({
    where: { userId, completedAt: { not: null } },
    include: { challenge: true },
    orderBy: { completedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    challenges: participations.map((p) => ({
      challengeId: p.challengeId,
      title: p.challenge.title,
      description: p.challenge.description,
      metric: p.challenge.metric,
      target: p.challenge.target,
      scope: p.challenge.scope,
      groupId: p.challenge.groupId,
      progress: p.progress,
      completedAt: p.completedAt,
    })),
  });
}
