// components/social/ExternalShareModal.tsx
// "Compartilhar de outro app" — conteúdo é sempre o que o próprio usuário
// fornece (link/imagem/legenda). Nunca busca dado de nenhuma API externa
// (checklist item 104: sem scraping, sem preencher distância/pace/mapa
// automaticamente).
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Link2, Image as ImageIcon, Loader2 } from "lucide-react";
import { useCreatePost } from "@/hooks/useCommunity";
import ProviderIcon from "@/components/ProviderIcon";
import { getProviderDisplay } from "@/lib/integrations/provider-display";

// Mesmos valores de externalShareProviderSchema (lib/community/validation.ts)
// — lista única de origens válidas para conteúdo ENVIADO PELO USUÁRIO (não
// significa integração de API). Label/ícone vêm do mapa central.
const SHARE_PROVIDER_KEYS = ["STRAVA", "GARMIN", "APPLE_FITNESS", "SAMSUNG_HEALTH", "NIKE_RUN_CLUB", "ADIDAS_RUNNING", "OTHER"] as const;

export default function ExternalShareModal({
  groupId,
  onClose,
  defaultProvider = "STRAVA",
  heading,
}: {
  groupId?: string;
  onClose: () => void;
  defaultProvider?: string;
  heading?: string;
}) {
  const createPost = useCreatePost(groupId);
  const [provider, setProvider] = useState(defaultProvider);
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/community/external-share/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erro ao enviar imagem");
      setImageUrl(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  };

  const canSubmit = !!(url.trim() || imageUrl || caption.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;
    createPost.mutate(
      {
        type: "EXTERNAL_SHARE",
        externalShareProvider: provider,
        externalShareUrl: url.trim() || undefined,
        externalShareImageUrl: imageUrl ?? undefined,
        text: caption.trim() || undefined,
        groupId,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto"
        >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
            <h3 className="font-semibold text-slate-800">{heading ?? "Compartilhar de outro app"}</h3>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">App de origem</label>
              <div className="flex flex-wrap gap-2">
                {SHARE_PROVIDER_KEYS.map((key) => {
                  const display = getProviderDisplay(key);
                  return (
                    <button
                      key={key}
                      onClick={() => setProvider(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border-2 ${
                        provider === key ? "border-[#007BFF] bg-[#007BFF]/10 text-[#007BFF]" : "border-slate-200 text-slate-500"
                      }`}
                    >
                      <ProviderIcon provider={key} size={13} className={provider === key ? "text-[#007BFF]" : display.accentClassName} />
                      {display.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block flex items-center gap-1">
                <Link2 size={12} /> Link (opcional)
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://strava.com/activities/..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#007BFF]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block flex items-center gap-1">
                <ImageIcon size={12} /> Imagem (opcional)
              </label>
              {imageUrl ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="" className="w-full h-40 object-cover rounded-xl" />
                  <button onClick={() => setImageUrl(null)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-4 text-sm text-slate-400 cursor-pointer hover:border-[#007BFF]/40">
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                  {uploading ? "Enviando..." : "Selecionar imagem"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                    }}
                  />
                </label>
              )}
              {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Legenda (opcional)</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 500))}
                rows={2}
                placeholder="Corrida de hoje 🔥"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#007BFF] resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || createPost.isPending || uploading}
              className="w-full bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {createPost.isPending ? "Publicando..." : "Publicar"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
