// app/api/community/reports/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createReportSchema } from "@/lib/community/validation";
import { RATE_LIMITS, RateLimitError, checkRateLimit, windowStart } from "@/lib/community/rate-limit";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const socialProfile = await prisma.socialProfile.findUnique({ where: { userId } });
  if (!socialProfile?.termsAcceptedAt) {
    return NextResponse.json({ error: "É necessário aceitar as Regras da Comunidade" }, { status: 403 });
  }

  try {
    await checkRateLimit(
      () => prisma.contentReport.count({ where: { reporterUserId: userId, createdAt: { gte: windowStart(RATE_LIMITS.createReport.windowMinutes) } } }),
      RATE_LIMITS.createReport
    );
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { targetType, targetId } = parsed.data;
  let exists = false;
  if (targetType === "POST") {
    exists = !!(await prisma.communityPost.findUnique({ where: { id: targetId }, select: { id: true } }));
  } else if (targetType === "COMMENT") {
    exists = !!(await prisma.communityComment.findUnique({ where: { id: targetId }, select: { id: true } }));
  } else if (targetType === "USER") {
    exists = !!(await prisma.socialProfile.findUnique({ where: { userId: targetId }, select: { userId: true } }));
  }
  if (!exists) return NextResponse.json({ error: "Alvo da denúncia não encontrado" }, { status: 404 });

  const report = await prisma.contentReport.create({
    data: {
      reporterUserId: userId,
      targetType,
      targetId,
      reason: parsed.data.reason,
      details: parsed.data.details ?? null,
    },
  });

  return NextResponse.json({ report }, { status: 201 });
}
