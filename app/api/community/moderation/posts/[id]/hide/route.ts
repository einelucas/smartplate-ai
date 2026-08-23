// app/api/community/moderation/posts/[id]/hide/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireModerator } from "@/lib/community/authz";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await requireModerator(userId);
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const params = await context.params;
  const post = await prisma.communityPost.update({ where: { id: params.id }, data: { hiddenAt: new Date() } });
  return NextResponse.json({ post });
}
