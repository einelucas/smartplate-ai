// app/api/community/groups/[id]/invite/route.ts
// Regenera o código de convite do grupo (invalida o anterior). OWNER/ADMIN.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireGroupRole } from "@/lib/community/authz";
import { generateUniqueInviteCode } from "@/lib/community/invite-code";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  try {
    await requireGroupRole(prisma, params.id, userId, ["OWNER", "ADMIN"]);
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const inviteCode = await generateUniqueInviteCode();
  const updated = await prisma.communityGroup.update({ where: { id: params.id }, data: { inviteCode } });

  return NextResponse.json({ inviteCode: updated.inviteCode });
}
