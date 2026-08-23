// app/api/user/physical-data/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { updatePhysicalDataSchema } from "@/lib/profile/validation";

// Campos legíveis via GET (inclui status de onboarding, somente leitura aqui).
const READABLE_FIELDS = [
  "height",
  "startWeight",
  "targetWeight",
  "currentWeight",
  "dietType",
  "cookingLevel",
  "onboardingCompletedAt",
  "onboardingVersion",
] as const;

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: Object.fromEntries(READABLE_FIELDS.map((f) => [f, true])),
    });
    return NextResponse.json(profile ?? {});
  } catch (error) {
    console.error("Erro ao buscar dados físicos:", error);
    return NextResponse.json({ error: "Erro ao buscar dados" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updatePhysicalDataSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const updateData = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));

  if (Object.keys(updateData).length === 0)
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });

  try {
    const updated = await prisma.profile.update({
      where: { userId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar dados físicos:", error);
    return NextResponse.json({ error: "Erro ao atualizar dados" }, { status: 500 });
  }
}
