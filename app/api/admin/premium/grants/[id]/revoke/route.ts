// app/api/admin/premium/grants/[id]/revoke/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { AuthzError, requireAdmin } from "@/lib/admin/authz";
import { PremiumGrantAdminError, revokePremiumGrant } from "@/lib/admin/premium";
import { revokePremiumGrantSchema } from "@/lib/admin/validation";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await requireAdmin(userId);
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = revokePremiumGrantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe o motivo da revogação", details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await context.params;

  try {
    const grant = await revokePremiumGrant({ id, actorUserId: userId, reason: parsed.data.reason });
    return NextResponse.json({ id: grant.id, revokedAt: grant.revokedAt });
  } catch (error) {
    if (error instanceof PremiumGrantAdminError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
