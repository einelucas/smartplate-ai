// app/api/meal-plans/[id]/share/route.ts
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  try {
    const plan = await prisma.mealPlan.findUnique({
      where: { id: params.id, userId },
    });

    if (!plan)
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });

    const shared = await prisma.sharedPlan.create({
      data: {
        mealPlanId: params.id,
        expiresAt: new Date(Date.now() + SHARE_TTL_MS),
      },
    });

    const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/shared/${shared.shareToken}`;

    return NextResponse.json({ success: true, shareUrl, shareToken: shared.shareToken });
  } catch (error) {
    console.error("Erro ao compartilhar plano:", error);
    return NextResponse.json({ error: "Erro ao compartilhar" }, { status: 500 });
  }
}
