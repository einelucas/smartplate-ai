// app/api/profile/username-availability/route.ts
// GET /api/profile/username-availability?username=lucas
// Checagem prévia de disponibilidade. Não substitui o tratamento de conflito
// real (@unique) feito em PATCH /api/community/me e POST /api/onboarding/complete.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { usernameSchema, isReservedUsername } from "@/lib/profile/validation";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("username") ?? "";

  const parsed = usernameSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ username: raw, available: false, reason: "invalid" });
  }

  const username = parsed.data;

  if (isReservedUsername(username)) {
    return NextResponse.json({ username, available: false, reason: "reserved" });
  }

  const existing = await prisma.socialProfile.findUnique({ where: { username }, select: { userId: true } });
  const available = !existing || existing.userId === userId;

  return NextResponse.json({ username, available, reason: available ? null : "taken" });
}
