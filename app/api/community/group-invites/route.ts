// app/api/community/group-invites/route.ts
// Lista convites de grupo PENDENTES recebidos pelo usuário autenticado.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invites = await prisma.groupInvite.findMany({
    where: { invitedUserId: userId, status: "PENDING" },
    include: { group: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    invites: invites.map((invite) => ({
      id: invite.id,
      groupId: invite.group.id,
      groupName: invite.group.name,
      createdAt: invite.createdAt,
    })),
  });
}
