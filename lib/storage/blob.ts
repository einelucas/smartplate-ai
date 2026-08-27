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

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Cópia servidor-a-servidor de uma imagem privada para outro folder/dono —
 * nunca passa pelo cliente. Usado por compartilhamento deliberado (ex.:
 * Antes & Depois na Comunidade), onde o registro de origem (ProgressPhoto)
 * continua privado por padrão e o post recebe seu PRÓPRIO blob, nunca uma
 * referência viva ao arquivo original.
 */
export async function copyPrivateImage(
  sourcePathname: string,
  params: { folder: BlobImageFolder; userId: string }
): Promise<{ pathname: string } | null> {
  const source = await streamPrivateImage(sourcePathname);
  if (!source) return null;

  const extension = EXTENSION_BY_CONTENT_TYPE[source.contentType] ?? "jpg";
  const pathname = `${params.folder}/${params.userId}/${crypto.randomUUID()}.${extension}`;
  const blob = await put(pathname, source.stream, { access: "private", contentType: source.contentType });
  return { pathname: blob.pathname };
}
