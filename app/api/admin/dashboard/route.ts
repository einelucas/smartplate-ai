// app/api/admin/dashboard/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { AuthzError, requireAdmin } from "@/lib/admin/authz";
import { getAdminDashboardStats } from "@/lib/admin/dashboard";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await requireAdmin(userId);
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const stats = await getAdminDashboardStats();
  return NextResponse.json(stats);
}
