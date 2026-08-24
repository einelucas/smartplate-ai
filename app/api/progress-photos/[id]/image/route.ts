// app/api/progress-photos/[id]/image/route.ts
// Proxy autenticado para o conteúdo do Blob privado — nunca uma URL do Blob
// exposta diretamente. Só o próprio dono da foto pode ler.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { streamPrivateImage } from "@/lib/storage/blob";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const params = await context.params;
  const photo = await prisma.progressPhoto.findUnique({ where: { id: params.id } });
  if (!photo || photo.userId !== userId) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 404 });
  }

  const result = await streamPrivateImage(photo.imageUrl);
  if (!result) return NextResponse.json({ error: "Imagem não encontrada." }, { status: 404 });

  return new NextResponse(result.stream, {
    headers: { "Content-Type": result.contentType, "Cache-Control": "private, max-age=300" },
  });
}
