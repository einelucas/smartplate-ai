// app/api/admin/premium/grants/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { AuthzError, requireAdmin } from "@/lib/admin/authz";
import { listPremiumGrants } from "@/lib/admin/premium";
import { paginationSchema, premiumGrantSourceFilterSchema, premiumGrantStatusFilterSchema } from "@/lib/admin/validation";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await requireAdmin(userId);
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const statusParsed = premiumGrantStatusFilterSchema.safeParse(searchParams.get("status") ?? undefined);
  const sourceParsed = premiumGrantSourceFilterSchema.safeParse(searchParams.get("source") ?? undefined);
  const paginationParsed = paginationSchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });
  if (!statusParsed.success || !sourceParsed.success || !paginationParsed.success) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const userId_ = searchParams.get("userId") || undefined;
  const { page, pageSize } = paginationParsed.data;
  const { rows, total } = await listPremiumGrants({
    status: statusParsed.data,
    source: sourceParsed.data,
    userId: userId_,
    page,
    pageSize,
  });

  return NextResponse.json({ rows, total, page, pageSize });
}
