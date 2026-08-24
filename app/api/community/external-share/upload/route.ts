// app/api/community/external-share/upload/route.ts
// Upload da imagem de um post EXTERNAL_SHARE ("Compartilhar de outro app").
// Reaproveita o mesmo storage local já usado por ProgressPhoto/avatar — não
// cria um segundo mecanismo de arquivos. A URL retornada aqui é o único
// valor aceito depois em externalShareImageUrl (ver lib/community/
// validation.ts); o cliente nunca envia uma URL arbitrária de imagem.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { saveUploadedImage } from "@/lib/storage/local-file-storage";
import { EXTERNAL_SHARE_ALLOWED_IMAGE_TYPES, EXTERNAL_SHARE_MAX_IMAGE_BYTES } from "@/lib/community/validation";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Selecione uma imagem" }, { status: 400 });
  }
  if (!EXTERNAL_SHARE_ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Formato de imagem não suportado" }, { status: 400 });
  }
  if (file.size > EXTERNAL_SHARE_MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "A imagem deve ter no máximo 5MB" }, { status: 400 });
  }

  // subdir embute o dono (sanitizeSubdir não preserva "/" como diretório —
  // por isso um único segmento, não um path aninhado): a URL resultante
  // carrega o userId, verificável depois em posts/route.ts.
  const { url } = await saveUploadedImage({ file, subdir: `community-share-${userId}` });

  return NextResponse.json({ url }, { status: 201 });
}
