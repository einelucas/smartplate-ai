// app/api/community/external-share/upload/route.ts
// Upload da imagem de um post EXTERNAL_SHARE ("Compartilhar de outro app").
// Vai para o Vercel Blob privado. Retorna o pathname (guardado depois em
// CommunityPost.metadata.imageUrl) + uma previewUrl (rota-proxy autenticada,
// só para o próprio uploader visualizar antes do post existir).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { uploadPrivateImage, isBlobConfigured, BLOB_MAX_IMAGE_BYTES } from "@/lib/storage/blob";
import { EXTERNAL_SHARE_ALLOWED_IMAGE_TYPES } from "@/lib/community/validation";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  if (!isBlobConfigured()) {
    return NextResponse.json({ error: "Não foi possível enviar a imagem." }, { status: 503 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Selecione uma imagem" }, { status: 400 });
  }
  if (!EXTERNAL_SHARE_ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
  }
  if (file.size > BLOB_MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Imagem muito grande." }, { status: 400 });
  }

  try {
    const { pathname } = await uploadPrivateImage({ file, folder: "external-shares", userId });
    return NextResponse.json(
      { pathname, previewUrl: `/api/community/external-share/preview?pathname=${encodeURIComponent(pathname)}` },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao enviar imagem de compartilhamento externo:", error);
    return NextResponse.json({ error: "Não foi possível enviar a imagem." }, { status: 500 });
  }
}
