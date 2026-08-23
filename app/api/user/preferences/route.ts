// app/api/user/preferences/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { updatePreferencesSchema } from "@/lib/profile/validation";

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Erro ao buscar preferências:", error);
    return NextResponse.json({ error: "Erro ao buscar preferências" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updatePreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const updateData = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));

  if (Object.keys(updateData).length === 0)
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });

  try {
    const updated = await prisma.userPreferences.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...updateData },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar preferências:", error);
    return NextResponse.json({ error: "Erro ao atualizar preferências" }, { status: 500 });
  }
}
