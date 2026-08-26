// app/api/community/users/search/route.ts
// Busca de usuários por username (NUNCA por e-mail). Exclui bloqueios em
// ambas as direções e perfis não descobríveis.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBlockedUserIds } from "@/lib/community/authz";
import { publicIdentitySelect, toPublicIdentity } from "@/lib/community/avatar";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  if (q.length < 2) return NextResponse.json({ users: [] });

  const blockedIds = await getBlockedUserIds(prisma, userId);

  const results = await prisma.socialProfile.findMany({
    where: {
      username: { contains: q, mode: "insensitive" },
      isDiscoverable: true,
      userId: { not: userId, notIn: Array.from(blockedIds) },
    },
    select: publicIdentitySelect,
    take: 20,
    orderBy: { username: "asc" },
  });

  return NextResponse.json({ users: results.map(toPublicIdentity) });
}
