// hooks/useCommunityMediaUpload.ts
// Upload sob demanda (só ao publicar — nunca ao selecionar/cortar) do
// arquivo final pro Blob privado. Retorna o pathname a ser enviado no
// payload de criação do post. Compartilhado por qualquer composer que
// aceite imagem — nunca duplicar esse fetch.
import { useState } from "react";

export type CommunityMediaFolder = "community" | "external-shares";

export function useCommunityMediaUpload() {
  const [uploading, setUploading] = useState(false);

  async function uploadMedia(file: File, folder: CommunityMediaFolder = "community"): Promise<string> {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("folder", folder);
      const res = await fetch("/api/community/media/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Não foi possível enviar a imagem.");
      return data.pathname as string;
    } finally {
      setUploading(false);
    }
  }

  return { uploadMedia, uploading };
}
