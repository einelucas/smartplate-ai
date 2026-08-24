// app/api/community/media/preview/route.ts
// Preview de upload ANTES do post existir — só o próprio uploader pode ver.
// Pathname sempre no formato "{folder}/{userId}/{uuid}.ext"; ownership é
// sempre o segundo segmento, então funciona pra qualquer folder (community,
// external-shares) sem precisar rota por folder. Depois que o post existe, a
// leitura passa a ser por /api/community/posts/[id]/image (autorização por
// visibilidade do post, não por dono do arquivo).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { streamPrivateImage } from "@/lib/storage/blob";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const pathname = new URL(request.url).searchParams.get("pathname");
  const owner = pathname?.split("/")[1];
  if (!pathname || owner !== userId) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const result = await streamPrivateImage(pathname);
  if (!result) return NextResponse.json({ error: "Imagem não encontrada." }, { status: 404 });

  return new NextResponse(result.stream, {
    headers: { "Content-Type": result.contentType, "Cache-Control": "private, max-age=300" },
  });
}
