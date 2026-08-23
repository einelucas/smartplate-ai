// app/api/beta/status/route.ts
// Status seguro do Beta para o próprio usuário — nunca retorna código/hash.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const grant = await prisma.premiumGrant.findFirst({
    where: { userId, source: "BETA_CODE" },
    orderBy: { createdAt: "desc" },
  });

  if (!grant) {
    return NextResponse.json({ redeemed: false, active: false, expiresAt: null });
  }

  const now = new Date();
  const active = grant.revokedAt === null && grant.startsAt <= now && grant.expiresAt > now;

  return NextResponse.json({ redeemed: true, active, expiresAt: grant.expiresAt });
}
