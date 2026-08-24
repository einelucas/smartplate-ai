// lib/storage/blob.ts
// Camada central de storage privado (Vercel Blob). Server-only — nunca
// importar num componente client. Todo upload é `access: "private"`; leitura
// só acontece via proxy autenticado (rotas que streamam o conteúdo depois de
// validar ownership/permissão), nunca por URL pública direta.
import { put, del, get } from "@vercel/blob";
import crypto from "crypto";

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const BLOB_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export type BlobImageFolder = "progress" | "community" | "external-shares";

/** "/uploads/..." = registro antigo do storage local (lib/storage/local-file-storage.ts) — nunca tentar tratar como pathname de Blob. */
export function isLocalUploadPath(value: string): boolean {
  return value.startsWith("/uploads/");
}

export async function uploadPrivateImage(params: {
  file: File;
  folder: BlobImageFolder;
  userId: string;
}): Promise<{ pathname: string }> {
  const extension = ALLOWED_IMAGE_TYPES[params.file.type];
  if (!extension) throw new Error("Formato de imagem não suportado");
  if (params.file.size > BLOB_MAX_IMAGE_BYTES) throw new Error("Imagem muito grande");

  const pathname = `${params.folder}/${params.userId}/${crypto.randomUUID()}.${extension}`;
  const blob = await put(pathname, params.file, { access: "private", contentType: params.file.type });
  return { pathname: blob.pathname };
}

export async function deletePrivateImage(pathname: string): Promise<void> {
  if (isLocalUploadPath(pathname)) return; // registro antigo — nada a apagar no Blob
  try {
    await del(pathname);
  } catch {
    // Não deixamos falha de limpeza do Blob quebrar a operação que a chamou
    // (ex.: exclusão do registro no banco já aconteceu/vai acontecer).
  }
}

/** Stream do conteúdo para as rotas-proxy servirem a imagem — nunca uma URL exposta ao cliente. */
export async function streamPrivateImage(pathname: string): Promise<{ stream: ReadableStream; contentType: string } | null> {
  const result = await get(pathname, { access: "private" });
  if (!result) return null;
  return { stream: result.stream, contentType: result.blob.contentType || "application/octet-stream" };
}
