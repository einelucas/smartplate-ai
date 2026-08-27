// app/api/admin/beta/codes/[id]/disable/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { AuthzError, requireAdmin } from "@/lib/admin/authz";
import { BetaCodeAdminError, disableBetaCode } from "@/lib/admin/beta";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await requireAdmin(userId);
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const { id } = await context.params;

  try {
    const betaCode = await disableBetaCode({ id, actorUserId: userId });
    return NextResponse.json({ id: betaCode.id, disabledAt: betaCode.disabledAt });
  } catch (error) {
    if (error instanceof BetaCodeAdminError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
