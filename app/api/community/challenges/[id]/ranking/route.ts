// app/api/community/challenges/[id]/ranking/route.ts
// Ranking interno de um desafio: progresso, percentual e, como desempate,
// quem completou primeiro. Concluídos sempre vêm antes de quem ainda não
// completou (ordenados por completedAt); entre os não concluídos, por
// progresso decrescente.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireGroupMembership } from "@/lib/community/authz";
import { publicIdentitySelect, resolveAvatarUrl } from "@/lib/community/avatar";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  const challenge = await prisma.challenge.findUnique({ where: { id: params.id } });
  if (!challenge) return NextResponse.json({ error: "Desafio não encontrado" }, { status: 404 });

  if (challenge.scope === "GROUP" && challenge.groupId) {
    try {
      await requireGroupMembership(prisma, challenge.groupId, userId);
    } catch (error) {
      if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
      throw error;
    }
  }

  const participants = await prisma.challengeParticipant.findMany({
    where: { challengeId: params.id },
  });

  const userIds = participants.map((p) => p.userId);
  const socialProfiles = await prisma.socialProfile.findMany({
    where: { userId: { in: userIds } },
    select: publicIdentitySelect,
  });
  const byUserId = new Map(socialProfiles.map((p) => [p.userId, p]));

  const sorted = [...participants].sort((a, b) => {
    if (a.completedAt && b.completedAt) return a.completedAt.getTime() - b.completedAt.getTime();
    if (a.completedAt) return -1;
    if (b.completedAt) return 1;
    return b.progress - a.progress;
  });

  const ranking = sorted.map((participant, index) => {
    const social = byUserId.get(participant.userId);
    return {
      rank: index + 1,
      userId: participant.userId,
      username: social?.username ?? null,
      displayName: social?.displayName ?? "Usuário SmartPlate",
      avatarUrl: social ? resolveAvatarUrl(social) : null,
      progress: participant.progress,
      target: challenge.target,
      percentage: Math.round((participant.progress / challenge.target) * 100),
      completedAt: participant.completedAt,
    };
  });

  // Progresso coletivo (só faz sentido para desafios de grupo) — soma do
  // progresso individual de cada participante, sem recontar o mesmo evento
  // (cada ChallengeParticipant.progress já é calculado isoladamente a partir
  // dos próprios dados do usuário, então somar não duplica nada).
  const collective =
    challenge.scope === "GROUP"
      ? {
          progress: participants.reduce((sum, p) => sum + p.progress, 0),
          target: challenge.target * Math.max(participants.length, 1),
          participantCount: participants.length,
        }
      : null;

  return NextResponse.json({ ranking, collective, viewerUserId: userId });
}
