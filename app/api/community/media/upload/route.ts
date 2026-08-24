// app/api/community/media/upload/route.ts
// Upload genérico de imagem da Comunidade — usado por post de texto com
// foto, compartilhamento de atividade e "Outro app" (external share). Um
// único endpoint em vez de espalhar put() por várias rotas (checklist da
// tarefa de Blob). Sempre privado; upload só acontece quando o usuário
// publica (o crop já aconteceu no client antes de chegar aqui).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { uploadPrivateImage, isBlobConfigured, BLOB_MAX_IMAGE_BYTES, type BlobImageFolder } from "@/lib/storage/blob";
import { EXTERNAL_SHARE_ALLOWED_IMAGE_TYPES } from "@/lib/community/validation";

const ALLOWED_FOLDERS = new Set<BlobImageFolder>(["community", "external-shares"]);

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  if (!isBlobConfigured()) {
    return NextResponse.json({ error: "Não foi possível enviar a imagem." }, { status: 503 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const rawFolder = formData.get("folder");
  const folder = typeof rawFolder === "string" && ALLOWED_FOLDERS.has(rawFolder as BlobImageFolder) ? (rawFolder as BlobImageFolder) : "community";

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
    const { pathname } = await uploadPrivateImage({ file, folder, userId });
    return NextResponse.json(
      { pathname, previewUrl: `/api/community/media/preview?pathname=${encodeURIComponent(pathname)}` },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao enviar imagem da comunidade:", error);
    return NextResponse.json({ error: "Não foi possível enviar a imagem." }, { status: 500 });
  }
}
