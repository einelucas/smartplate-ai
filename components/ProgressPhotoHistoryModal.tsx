// components/ProgressPhotoHistoryModal.tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Pencil, Check, ImageOff, Share2 } from "lucide-react";
import { useProgressPhotos, type ProgressPhoto } from "@/hooks/useProgressPhotos";

const ShareProgressPhotoModal = dynamic(() => import("@/components/social/ShareProgressPhotoModal"), { ssr: false });

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function PhotoRow({ photo }: { photo: ProgressPhoto }) {
  const { updatePhoto, deletePhoto } = useProgressPhotos();
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [weight, setWeight] = useState(photo.weight != null ? String(photo.weight) : "");
  const [notes, setNotes] = useState(photo.notes ?? "");

  const handleSave = () => {
    updatePhoto.mutate(
      {
        id: photo.id,
        weight: weight.trim() ? Number(weight) : null,
        notes: notes.trim() || null,
      },
      { onSuccess: () => setEditing(false) }
    );
  };

  const handleDelete = () => {
    if (!confirm("Excluir esta foto de progresso? Essa ação não pode ser desfeita.")) return;
    deletePhoto.mutate(photo.id);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50">
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.imageUrl} alt={`Foto de progresso de ${formatDate(photo.takenAt)}`} className="w-full h-full object-cover" />
      </div>

      {editing ? (
        <div className="flex-1 min-w-0 space-y-1.5">
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Peso (kg)"
            className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs"
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 200))}
            placeholder="Observação"
            className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs"
          />
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700">{formatDate(photo.takenAt)}</p>
          <p className="text-xs text-slate-400 truncate">
            {photo.weight != null ? `${photo.weight} kg` : "Peso não informado"}
            {photo.notes ? ` • ${photo.notes}` : ""}
          </p>
        </div>
      )}

      <div className="flex items-center gap-1 flex-shrink-0">
        {editing ? (
          <button onClick={handleSave} title="Salvar" aria-label="Salvar" className="p-2 text-[#28A745] hover:bg-[#28A745]/10 rounded-lg">
            <Check size={14} />
          </button>
        ) : (
          <>
            <button onClick={() => setEditing(true)} title="Editar" aria-label="Editar foto" className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
              <Pencil size={14} />
            </button>
            <button onClick={() => setSharing(true)} title="Compartilhar" aria-label="Compartilhar foto" className="p-2 text-slate-400 hover:text-[#28A745] hover:bg-[#28A745]/10 rounded-lg">
              <Share2 size={14} />
            </button>
          </>
        )}
        <button onClick={handleDelete} title="Excluir" aria-label="Excluir foto" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
          <Trash2 size={14} />
        </button>
      </div>

      {sharing && (
        <ShareProgressPhotoModal
          progressPhotoId={photo.id}
          imageUrl={photo.imageUrl}
          takenAt={photo.takenAt}
          hasWeight={photo.weight != null}
          onClose={() => setSharing(false)}
        />
      )}
    </div>
  );
}

export default function ProgressPhotoHistoryModal({ onClose }: { onClose: () => void }) {
  const { photos, isLoading } = useProgressPhotos();
  // Mais recente primeiro para navegação do histórico.
  const ordered = [...photos].reverse();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col"
        >
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">Histórico de fotos</h2>
            <button type="button" onClick={onClose} aria-label="Fechar" title="Fechar" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={18} className="text-slate-400" />
            </button>
          </div>

          <div className="p-3 overflow-y-auto flex-1">
            {isLoading && <p className="text-sm text-slate-400 p-3">Carregando...</p>}
            {!isLoading && ordered.length === 0 && (
              <div className="text-center py-10">
                <ImageOff className="mx-auto text-slate-300 mb-2" size={28} />
                <p className="text-sm text-slate-500">Nenhuma foto ainda.</p>
              </div>
            )}
            {ordered.map((photo) => (
              <PhotoRow key={photo.id} photo={photo} />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
