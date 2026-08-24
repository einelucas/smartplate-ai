// app/api/community/external-share/preview/route.ts
// Preview do upload ANTES do post existir — só o próprio uploader pode ver
// (valida que o pathname pertence a ele, prefixo external-shares/{userId}/).
// Depois que o post é criado, a leitura passa a ser por
// /api/community/posts/[id]/image (autorização por visibilidade do post).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { streamPrivateImage } from "@/lib/storage/blob";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const pathname = new URL(request.url).searchParams.get("pathname");
  if (!pathname || !pathname.startsWith(`external-shares/${userId}/`)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const result = await streamPrivateImage(pathname);
  if (!result) return NextResponse.json({ error: "Imagem não encontrada." }, { status: 404 });

  return new NextResponse(result.stream, {
    headers: { "Content-Type": result.contentType, "Cache-Control": "private, max-age=300" },
  });
}
