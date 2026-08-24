// components/social/ExternalShareModal.tsx
// Seletor de provider + link pro attachment EXTERNAL_SHARE do PostComposer.
// NÃO publica nada, NÃO tem campo de imagem próprio — foto/legenda/destino
// ficam só no Composer (mesmo PostMediaField/crop de qualquer outro tipo de
// post). Nunca busca dado de API externa (sem scraping) — só o que o
// usuário digitar aqui.
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Link2 } from "lucide-react";
import ProviderIcon from "@/components/ProviderIcon";
import { getProviderDisplay } from "@/lib/integrations/provider-display";
import type { PostAttachment } from "@/lib/community/post-draft";

const SHARE_PROVIDER_KEYS = ["STRAVA", "GARMIN", "APPLE_FITNESS", "SAMSUNG_HEALTH", "NIKE_RUN_CLUB", "ADIDAS_RUNNING", "OTHER"] as const;

export default function ExternalShareModal({
  defaultProvider = "STRAVA",
  heading,
  onClose,
  onSelect,
}: {
  defaultProvider?: string;
  heading?: string;
  onClose: () => void;
  onSelect: (attachment: Extract<PostAttachment, { type: "EXTERNAL_SHARE" }>) => void;
}) {
  const [provider, setProvider] = useState(defaultProvider);
  const [url, setUrl] = useState("");

  const handleAdd = () => {
    onSelect({ type: "EXTERNAL_SHARE", provider, url: url.trim() || undefined });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto"
        >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
            <h3 className="font-semibold text-slate-800">{heading ?? "Compartilhar de outro app"}</h3>
            <button onClick={onClose} aria-label="Fechar" className="p-2 text-slate-400 hover:text-slate-700 rounded-lg">
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

            <p className="text-xs text-slate-400">A legenda e a imagem (opcionais) você escreve/anexa no post, no próximo passo.</p>

            <button
              onClick={handleAdd}
              className="w-full bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl py-2.5 text-sm font-semibold"
            >
              Adicionar ao post
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
