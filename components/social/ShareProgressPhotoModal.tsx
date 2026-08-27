// components/social/ShareProgressPhotoModal.tsx
// Único "picker" desta foto específica — só decide se mostra o peso antes de
// entregar o attachment resolvido pro Composer global. A cópia do blob
// privado só acontece no servidor, na criação do post (nunca aqui).
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share2 } from "lucide-react";
import { useOpenPostComposer } from "./PostComposerProvider";

export default function ShareProgressPhotoModal({
  progressPhotoId,
  imageUrl,
  takenAt,
  hasWeight,
  onClose,
}: {
  progressPhotoId: string;
  imageUrl: string;
  takenAt: string;
  hasWeight: boolean;
  onClose: () => void;
}) {
  const [showWeight, setShowWeight] = useState(false);
  const openComposer = useOpenPostComposer();

  const submit = () => {
    openComposer({ attachment: { type: "PROGRESS_SHARE", progressPhotoId, takenAt, showWeight } });
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Share2 size={18} className="text-[#28A745]" />
              <h3 className="font-bold text-slate-800">Compartilhar progresso</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <div className="w-full h-40 rounded-xl overflow-hidden bg-slate-100 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          </div>

          {hasWeight && (
            <label className="flex items-center gap-2 mb-5 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={showWeight} onChange={(e) => setShowWeight(e.target.checked)} className="accent-[#007BFF]" />
              Mostrar meu peso na publicação
            </label>
          )}

          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2.5 mb-4">
            Esta publicação nunca é feita automaticamente — você ainda escolhe a legenda e o destino na próxima tela, e pode cancelar a qualquer momento.
          </p>

          <button onClick={submit} className="w-full bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl py-2.5 text-sm font-medium">
            Continuar
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
