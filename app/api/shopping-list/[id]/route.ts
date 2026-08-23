// app/api/shopping-list/[id]/route.ts
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/shopping-list/[id]
 * Aceita: { items: Array<{ name, quantity, category, estimated_price, checked }> }
 */
export async function PATCH(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  try {
    const body = await request.json();
    if (!Array.isArray(body.items))
      return NextResponse.json({ error: "Campo 'items' é obrigatório" }, { status: 400 });

    const updated = await prisma.shoppingList.update({
      where: { id: params.id, userId },
      data: { items: body.items },
    });

    return NextResponse.json({ list: updated });
  } catch (error) {
    console.error("Erro ao atualizar lista de compras:", error);
    return NextResponse.json({ error: "Erro ao atualizar lista" }, { status: 500 });
  }
}
