// app/api/community/blocks/[userId]/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  await prisma.communityBlock.deleteMany({ where: { blockerUserId: userId, blockedUserId: params.userId } });
  return NextResponse.json({ success: true });
}
