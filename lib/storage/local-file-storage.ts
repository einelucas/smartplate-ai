// lib/storage/local-file-storage.ts
// Armazenamento local de arquivos em public/uploads/**. É a solução mais
// simples e coerente com a arquitetura atual — o projeto ainda não tem
// nenhum blob storage configurado. Nunca grava base64 no banco, só a URL.
//
// Limitação conhecida: em deploy serverless (Vercel), o filesystem não é
// persistente entre invocações/regiões — para produção, migrar para um blob
// store real (Vercel Blob, S3, etc.) reaproveitando esta mesma interface
// (saveUploadedImage/deleteUploadedImage).
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function sanitizeSubdir(subdir: string): string {
  return subdir.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export async function saveUploadedImage(params: { file: File; subdir: string }): Promise<{ url: string }> {
  const subdir = sanitizeSubdir(params.subdir);
  const extension = EXTENSION_BY_MIME[params.file.type] || "jpg";
  const filename = `${crypto.randomUUID()}.${extension}`;
  const dir = path.join(UPLOADS_ROOT, subdir);
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await params.file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return { url: `/uploads/${subdir}/${filename}` };
}

export async function deleteUploadedImage(url: string): Promise<void> {
  if (!url.startsWith("/uploads/")) return; // nunca apaga nada fora da pasta de uploads
  const filePath = path.join(process.cwd(), "public", url);
  try {
    await unlink(filePath);
  } catch {
    // arquivo já não existe — sem problema
  }
}
