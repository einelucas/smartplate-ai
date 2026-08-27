// app/api/community/content-mutes/[postType]/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, context: { params: Promise<{ postType: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  await prisma.userContentMute.deleteMany({ where: { userId, postType: params.postType } });
  return NextResponse.json({ success: true });
}
