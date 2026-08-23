// app/api/progress-photos/route.ts
// Fotos de progresso (Antes & Depois). Dado privado do usuário — nunca
// exposto pela Comunidade. Upload via multipart/form-data; a URL da imagem
// nunca é aceita diretamente do cliente, só o arquivo.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUploadedImage } from "@/lib/storage/local-file-storage";
import { ALLOWED_PROGRESS_PHOTO_TYPES, MAX_PROGRESS_PHOTO_BYTES, createProgressPhotoSchema } from "@/lib/profile/validation";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const photos = await prisma.progressPhoto.findMany({
    where: { userId },
    orderBy: { takenAt: "asc" },
  });

  return NextResponse.json({ photos });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Selecione uma foto" }, { status: 400 });
  }
  if (!ALLOWED_PROGRESS_PHOTO_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Formato de imagem não suportado" }, { status: 400 });
  }
  if (file.size > MAX_PROGRESS_PHOTO_BYTES) {
    return NextResponse.json({ error: "A imagem deve ter no máximo 5MB" }, { status: 400 });
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

  const { url } = await saveUploadedImage({ file, subdir: userId });

  try {
    const photo = await prisma.progressPhoto.create({
      data: {
        userId,
        imageUrl: url,
        weight: parsed.data.weight ?? null,
        notes: parsed.data.notes ?? null,
        ...(parsed.data.takenAt ? { takenAt: parsed.data.takenAt } : {}),
      },
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error("Erro ao salvar foto de progresso:", error);
    return NextResponse.json({ error: "Erro ao salvar foto" }, { status: 500 });
  }
}
