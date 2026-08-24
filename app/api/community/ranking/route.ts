// app/api/community/ranking/route.ts
// Ranking por período (semanal/mensal/geral) e escopo (geral/amigos/grupo),
// sempre a partir de XpEvent (nunca de totalXp).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireGroupMembership } from "@/lib/community/authz";
import { getRanking, type RankingPeriod, type RankingScope } from "@/lib/community/gamification";

function parsePeriod(raw: string | null): RankingPeriod {
  if (raw === "monthly" || raw === "all") return raw;
  return "weekly";
}

function parseScope(raw: string | null): RankingScope {
  if (raw === "friends" || raw === "group") return raw;
  return "global";
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period = parsePeriod(searchParams.get("period"));
  const scope = parseScope(searchParams.get("scope"));
  const groupId = searchParams.get("groupId") || undefined;

  if (scope === "group") {
    if (!groupId) return NextResponse.json({ error: "groupId é obrigatório para scope=group" }, { status: 400 });
    try {
      await requireGroupMembership(prisma, groupId, userId);
    } catch (error) {
      if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
      throw error;
    }
  }

  const result = await getRanking({ period, scope, groupId, viewerUserId: userId });
  return NextResponse.json({ ranking: result.ranking, viewer: result.viewer, viewerUserId: userId, period, scope });
}
