// app/api/community/moderation/reports/route.ts
// Lista denúncias para MODERATOR/ADMIN, com preview do conteúdo denunciado.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireModerator } from "@/lib/community/authz";

const VALID_STATUSES = new Set(["PENDING", "RESOLVED", "DISMISSED"]);

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await requireModerator(userId);
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status") || "PENDING";
  const status = VALID_STATUSES.has(statusParam) ? (statusParam as "PENDING" | "RESOLVED" | "DISMISSED") : "PENDING";

  const reports = await prisma.contentReport.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const enriched = await Promise.all(
    reports.map(async (report) => {
      let preview: unknown = null;
      if (report.targetType === "POST") {
        preview = await prisma.communityPost.findUnique({ where: { id: report.targetId } });
      } else if (report.targetType === "COMMENT") {
        preview = await prisma.communityComment.findUnique({ where: { id: report.targetId } });
      } else if (report.targetType === "USER") {
        preview = await prisma.socialProfile.findUnique({ where: { userId: report.targetId } });
      }
      const reporter = await prisma.socialProfile.findUnique({
        where: { userId: report.reporterUserId },
        select: { username: true, displayName: true },
      });
      return { ...report, preview, reporter };
    })
  );

  return NextResponse.json({ reports: enriched });
}
