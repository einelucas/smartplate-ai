// app/api/community/challenges/route.ts
// Desafios GLOBAL só podem ser criados por MODERATOR/ADMIN. Desafios GROUP
// podem ser criados por qualquer membro do grupo. Progresso nunca é aceito
// do cliente — ver lib/community/gamification.ts.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireGroupMembership, requireModerator } from "@/lib/community/authz";
import { createChallengeSchema } from "@/lib/community/validation";
import { notifyIfEnabled } from "@/lib/community/notify";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") === "group" ? "GROUP" : "GLOBAL";
  const groupId = searchParams.get("groupId") || undefined;

  if (scope === "GROUP") {
    if (!groupId) return NextResponse.json({ error: "groupId é obrigatório para scope=group" }, { status: 400 });
    try {
      await requireGroupMembership(prisma, groupId, userId);
    } catch (error) {
      if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
      throw error;
    }
  }

  const challenges = await prisma.challenge.findMany({
    where: {
      scope,
      ...(scope === "GROUP" ? { groupId } : {}),
      endsAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // inclui recém-encerrados (24h) para exibir resultado final
    },
    orderBy: { endsAt: "asc" },
    take: 30,
  });

  const participants = await prisma.challengeParticipant.findMany({
    where: { userId, challengeId: { in: challenges.map((c) => c.id) } },
  });
  const byChallengeId = new Map(participants.map((p) => [p.challengeId, p]));

  return NextResponse.json({
    challenges: challenges.map((c) => ({
      ...c,
      myProgress: byChallengeId.get(c.id)?.progress ?? null,
      myCompletedAt: byChallengeId.get(c.id)?.completedAt ?? null,
      joined: byChallengeId.has(c.id),
    })),
  });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createChallengeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  if (data.scope === "GLOBAL") {
    try {
      await requireModerator(userId);
    } catch (error) {
      if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
      throw error;
    }
  } else {
    try {
      await requireGroupMembership(prisma, data.groupId as string, userId);
    } catch (error) {
      if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
      throw error;
    }
  }

  const challenge = await prisma.challenge.create({
    data: {
      creatorUserId: userId,
      groupId: data.scope === "GROUP" ? data.groupId : null,
      scope: data.scope,
      title: data.title,
      description: data.description ?? null,
      metric: data.metric,
      target: data.target,
      collectiveTarget: data.scope === "GROUP" ? (data.collectiveTarget ?? null) : null,
      rewardXp: data.rewardXp,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
    },
  });

  // Notifica os demais membros do grupo (nunca quem criou) — desafios GLOBAL
  // ficam de fora: seria um broadcast pra toda a base, escopo maior do que
  // uma notificação social simples.
  if (data.scope === "GROUP") {
    const members = await prisma.groupMember.findMany({
      where: { groupId: data.groupId as string, userId: { not: userId } },
      select: { userId: true },
    });
    await Promise.all(
      members.map((member) =>
        notifyIfEnabled(member.userId, "notifyChallenges", {
          type: "GROUP_CHALLENGE_STARTED",
          title: "🏁 Novo desafio no grupo",
          body: `Um novo desafio "${challenge.title}" começou no seu grupo.`,
          data: { challengeId: challenge.id, groupId: data.groupId },
        })
      )
    );
  }

  return NextResponse.json({ challenge }, { status: 201 });
}
