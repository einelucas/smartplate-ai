// app/api/community/moderation/reports/[id]/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireModerator } from "@/lib/community/authz";
import { resolveReportSchema } from "@/lib/community/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await requireModerator(userId);
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = resolveReportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const params = await context.params;
  const report = await prisma.contentReport.update({
    where: { id: params.id },
    data: { status: parsed.data.status, reviewedAt: new Date() },
  });

  return NextResponse.json({ report });
}
