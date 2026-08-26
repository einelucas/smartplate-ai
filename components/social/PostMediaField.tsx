// components/social/PostMediaField.tsx
// Campo de imagem completo e autocontido: seleção → preview local → crop →
// preview do resultado → editar de novo/remover. Upload NUNCA acontece aqui
// — só entrega o File final (já cortado) via onChange; quem publica decide
// quando fazer o upload (checklist item 12/44). Reutilizado por qualquer
// composer que aceite imagem — nunca duplicar esse estado por fluxo.
"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Image as ImageIcon, Pencil, Trash2 } from "lucide-react";
import { EXTERNAL_SHARE_ALLOWED_IMAGE_TYPES, EXTERNAL_SHARE_MAX_IMAGE_BYTES } from "@/lib/community/validation";

const ImageCropDialog = dynamic(() => import("./ImageCropDialog"), { ssr: false });

type MediaState = { file: File; objectUrl: string };

export default function PostMediaField({
  onChange,
  onError,
  variant = "icon",
  disabled,
}: {
  /**
   * Chamado com o File final (já cortado) pronto pra upload, ou null quando
   * removido. `dimensions` é a largura/altura reais do arquivo final (depois
   * do crop e do redimensionamento proporcional) — usadas pelo feed pra
   * reservar o espaço da imagem antes dela carregar, sem esperar o
   * navegador decodificar o arquivo (evita o card "crescer" enquanto a
   * imagem carrega).
   */
  onChange: (file: File | null, dimensions?: { width: number; height: number }) => void;
  onError?: (message: string) => void;
  /** "icon" = botão compacto (toolbar do composer). "dropzone" = área maior (ex.: External Share). */
  variant?: "icon" | "dropzone";
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [original, setOriginal] = useState<MediaState | null>(null);
  const [current, setCurrent] = useState<MediaState | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  // Limpeza ao desmontar (fechar o composer sem publicar) — nunca deixar
  // object URL vazando (item 28).
  useEffect(() => {
    return () => {
      if (original) URL.revokeObjectURL(original.objectUrl);
      if (current) URL.revokeObjectURL(current.objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = (file: File) => {
    if (!EXTERNAL_SHARE_ALLOWED_IMAGE_TYPES.has(file.type)) {
      onError?.("Arquivo inválido.");
      return;
    }
    if (file.size > EXTERNAL_SHARE_MAX_IMAGE_BYTES) {
      onError?.("Imagem muito grande.");
      return;
    }
    if (original) URL.revokeObjectURL(original.objectUrl);
    setOriginal({ file, objectUrl: URL.createObjectURL(file) });
    setShowCropper(true);
  };

  const handleCropApply = (croppedFile: File, dimensions: { width: number; height: number }) => {
    setCurrent((prev) => {
      if (prev) URL.revokeObjectURL(prev.objectUrl);
      return { file: croppedFile, objectUrl: URL.createObjectURL(croppedFile) };
    });
    setShowCropper(false);
    onChange(croppedFile, dimensions);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    // Só descarta o original se ainda não existe um resultado aplicado antes
    // (ex.: usuário abriu "Editar" de novo e cancelou — mantém o atual).
    if (!current && original) {
      URL.revokeObjectURL(original.objectUrl);
      setOriginal(null);
    }
  };

  const handleRemove = () => {
    if (current) URL.revokeObjectURL(current.objectUrl);
    if (original) URL.revokeObjectURL(original.objectUrl);
    setCurrent(null);
    setOriginal(null);
    onChange(null);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) handleFile(file);
        }}
      />

      {current ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.objectUrl} alt="Imagem selecionada" className="w-full max-h-72 object-contain bg-slate-50" />
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => setShowCropper(true)}
              aria-label="Editar imagem"
              className="w-9 h-9 flex items-center justify-center bg-black/60 hover:bg-black/70 text-white rounded-full"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remover imagem"
              className="w-9 h-9 flex items-center justify-center bg-black/60 hover:bg-black/70 text-white rounded-full"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ) : variant === "dropzone" ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-4 text-sm text-slate-400 hover:border-[#007BFF]/40 disabled:opacity-50"
        >
          <ImageIcon size={16} /> Selecionar imagem
        </button>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          aria-label="Adicionar foto"
          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-[#007BFF] hover:bg-slate-100 rounded-xl disabled:opacity-40 flex-shrink-0"
        >
          <ImageIcon size={20} />
        </button>
      )}

      {showCropper && original && (
        <ImageCropDialog imageSrc={original.objectUrl} originalFile={original.file} onCancel={handleCropCancel} onApply={handleCropApply} />
      )}
    </>
  );
}
