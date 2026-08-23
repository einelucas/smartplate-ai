import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const params = await context.params;
  try {
    // Verificar se o log pertence ao usuário
    const log = await prisma.weightLog.findUnique({
      where: { id: params.id },
    });

    if (!log) {
      return NextResponse.json(
        { error: "Registro não encontrado" },
        { status: 404 },
      );
    }

    if (log.userId !== userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    await prisma.weightLog.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar log:", error);
    return NextResponse.json(
      { error: "Erro ao deletar registro" },
      { status: 500 },
    );
  }
}
