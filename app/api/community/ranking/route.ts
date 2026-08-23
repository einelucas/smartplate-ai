// app/api/community/ranking/route.ts
// Ranking semanal calculado a partir de XpEvent (nunca de totalXp).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireGroupMembership } from "@/lib/community/authz";
import { getWeeklyRanking } from "@/lib/community/gamification";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") === "group" ? "group" : "global";
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

  const ranking = await getWeeklyRanking({ scope, groupId });
  return NextResponse.json({ ranking, viewerUserId: userId });
}
