// app/api/progress-photos/[id]/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteUploadedImage } from "@/lib/storage/local-file-storage";
import { deletePrivateImage, isLocalUploadPath } from "@/lib/storage/blob";
import { updateProgressPhotoSchema } from "@/lib/profile/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  const photo = await prisma.progressPhoto.findUnique({ where: { id: params.id } });
  if (!photo || photo.userId !== userId) {
    return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateProgressPhotoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const updateData = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
  }

  const updated = await prisma.progressPhoto.update({ where: { id: params.id }, data: updateData });
  return NextResponse.json({ photo: updated });
}

export async function DELETE(_request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  const photo = await prisma.progressPhoto.findUnique({ where: { id: params.id } });
  if (!photo || photo.userId !== userId) {
    return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
  }

  await prisma.progressPhoto.delete({ where: { id: params.id } });
  if (isLocalUploadPath(photo.imageUrl)) {
    await deleteUploadedImage(photo.imageUrl);
  } else {
    await deletePrivateImage(photo.imageUrl);
  }

  return NextResponse.json({ success: true });
}
