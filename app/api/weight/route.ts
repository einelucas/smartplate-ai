// app/api/weight/route.ts
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { registerWeightSchema } from "@/lib/profile/validation";

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const logs = await prisma.weightLog.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    });
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Erro ao buscar histórico de peso:", error);
    return NextResponse.json({ error: "Erro ao buscar histórico" }, { status: 500 });
  }
}

/**
 * POST /api/weight
 * Registra um novo peso e mantém Profile.currentWeight (e startWeight, se
 * ainda vazio) sincronizados em uma única transação — histórico e peso atual
 * nunca podem divergir.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = registerWeightSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Peso inválido", details: parsed.error.flatten() }, { status: 400 });
  }

  const { weight, notes, date } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const log = await tx.weightLog.create({
        data: {
          userId,
          weight,
          notes: notes ?? null,
          date: date ?? new Date(),
        },
      });

      const profile = await tx.profile.findUnique({ where: { userId }, select: { startWeight: true } });

      const updated = await tx.profile.update({
        where: { userId },
        data: {
          currentWeight: weight,
          ...(profile?.startWeight == null ? { startWeight: weight } : {}),
        },
      });

      return { log, profile: updated };
    });

    return NextResponse.json({ success: true, log: result.log });
  } catch (error) {
    console.error("Erro ao registrar peso:", error);
    return NextResponse.json({ error: "Erro ao registrar peso" }, { status: 500 });
  }
}
