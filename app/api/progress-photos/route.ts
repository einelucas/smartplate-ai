// app/api/progress-photos/route.ts
// Fotos de progresso (Antes & Depois). Dado privado do usuário — nunca
// exposto pela Comunidade. Upload vai para o Vercel Blob privado; o campo
// `imageUrl` no banco guarda o pathname do Blob (ou, para registros antigos,
// o path local "/uploads/..." — preservado para compatibilidade de leitura).
// Para o cliente, sempre devolvemos uma URL renderizável: o pathname vira a
// rota-proxy autenticada /api/progress-photos/{id}/image; o path antigo já é
// servido direto pelo Next (estático em public/uploads).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadPrivateImage, deletePrivateImage, isLocalUploadPath, isBlobConfigured, BLOB_MAX_IMAGE_BYTES } from "@/lib/storage/blob";
import { ALLOWED_PROGRESS_PHOTO_TYPES, createProgressPhotoSchema } from "@/lib/profile/validation";
import type { ProgressPhoto } from "@prisma/client";

function toClientPhoto(photo: ProgressPhoto) {
  return {
    ...photo,
    imageUrl: isLocalUploadPath(photo.imageUrl) ? photo.imageUrl : `/api/progress-photos/${photo.id}/image`,
  };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const photos = await prisma.progressPhoto.findMany({
    where: { userId },
    orderBy: { takenAt: "asc" },
  });

  return NextResponse.json({ photos: photos.map(toClientPhoto) });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isBlobConfigured()) {
    return NextResponse.json({ error: "Não foi possível enviar a imagem." }, { status: 503 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Selecione uma foto" }, { status: 400 });
  }
  if (!ALLOWED_PROGRESS_PHOTO_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
  }
  if (file.size > BLOB_MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Imagem muito grande." }, { status: 400 });
  }

  const rawWeight = formData.get("weight");
  const rawNotes = formData.get("notes");
  const rawTakenAt = formData.get("takenAt");

  const parsed = createProgressPhotoSchema.safeParse({
    weight: rawWeight ? Number(rawWeight) : undefined,
    notes: rawNotes ? String(rawNotes) : undefined,
    takenAt: rawTakenAt ? String(rawTakenAt) : undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  let pathname: string;
  try {
    ({ pathname } = await uploadPrivateImage({ file, folder: "progress", userId }));
  } catch (error) {
    console.error("Erro ao enviar foto de progresso para o Blob:", error);
    return NextResponse.json({ error: "Não foi possível enviar a imagem." }, { status: 500 });
  }

  try {
    const photo = await prisma.progressPhoto.create({
      data: {
        userId,
        imageUrl: pathname,
        weight: parsed.data.weight ?? null,
        notes: parsed.data.notes ?? null,
        ...(parsed.data.takenAt ? { takenAt: parsed.data.takenAt } : {}),
      },
    });

    return NextResponse.json({ photo: toClientPhoto(photo) }, { status: 201 });
  } catch (error) {
    console.error("Erro ao salvar foto de progresso:", error);
    await deletePrivateImage(pathname); // evita blob órfão (insert falhou)
    return NextResponse.json({ error: "Não foi possível enviar a imagem." }, { status: 500 });
  }
}
