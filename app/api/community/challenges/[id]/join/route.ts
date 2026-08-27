// app/api/community/challenges/[id]/join/route.ts
// Progresso inicial é sempre calculado no servidor (nunca aceito do cliente).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireGroupMembership } from "@/lib/community/authz";
import { computeInitialChallengeProgress, recordChallengeCompletion } from "@/lib/community/gamification";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  const challenge = await prisma.challenge.findUnique({ where: { id: params.id } });
  if (!challenge) return NextResponse.json({ error: "Desafio não encontrado" }, { status: 404 });
  if (challenge.endsAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Este desafio já encerrou" }, { status: 400 });
  }

  if (challenge.scope === "GROUP" && challenge.groupId) {
    try {
      await requireGroupMembership(prisma, challenge.groupId, userId);
    } catch (error) {
      if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
      throw error;
    }
  }

  const existing = await prisma.challengeParticipant.findUnique({
    where: { challengeId_userId: { challengeId: params.id, userId } },
  });
  if (existing) return NextResponse.json({ participant: existing, alreadyJoined: true });

  const initialProgress = await computeInitialChallengeProgress(prisma, userId, challenge.metric, challenge.startsAt);
  const cappedProgress = Math.min(initialProgress, challenge.target);
  const alreadyMeetsTarget = cappedProgress >= challenge.target;

  const participant = await prisma.$transaction(async (tx) => {
    const created = await tx.challengeParticipant.create({
      data: {
        challengeId: params.id,
        userId,
        progress: cappedProgress,
        completedAt: alreadyMeetsTarget ? new Date() : null,
      },
    });
    if (alreadyMeetsTarget) {
      await recordChallengeCompletion(tx, userId, params.id, challenge.rewardXp, challenge.title, challenge.groupId);
    }
    return created;
  });

  return NextResponse.json({ participant, alreadyJoined: false }, { status: 201 });
}
