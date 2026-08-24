// components/social/ImageViewerDialog.tsx
// Visualização ampliada simples de uma imagem do feed — sem zoom/gestos
// avançados, só um dialog que mostra a imagem inteira (item 51: "não crie
// sistema complexo").
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function ImageViewerDialog({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4"
      >
        <button
          onClick={onClose}
          aria-label="Fechar visualização"
          className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center text-white/80 hover:text-white bg-white/10 rounded-full"
        >
          <X size={20} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
      </motion.div>
    </AnimatePresence>
  );
}
