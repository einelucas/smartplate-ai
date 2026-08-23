// components/AddProgressPhotoModal.tsx
"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Upload, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useProgressPhotos } from "@/hooks/useProgressPhotos";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function todayInputValue(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export default function AddProgressPhotoModal({
  isOpen,
  onClose,
  currentWeight,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentWeight?: number;
}) {
  const { addPhoto } = useProgressPhotos();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [date, setDate] = useState(todayInputValue());
  const [weight, setWeight] = useState(currentWeight ? String(currentWeight) : "");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setFile(null);
    setPreview(null);
    setDate(todayInputValue());
    setWeight(currentWeight ? String(currentWeight) : "");
    setNotes("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (addPhoto.isPending) return; // evita fechar/perder o upload em andamento
    reset();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!ALLOWED_TYPES.has(selected.type)) {
      toast.error("Formato de imagem não suportado");
      return;
    }
    if (selected.size > MAX_BYTES) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || addPhoto.isPending) return; // impede duplo submit/upload duplicado

    const parsedWeight = weight.trim() ? Number(weight) : undefined;
    if (weight.trim() && (Number.isNaN(parsedWeight) || (parsedWeight as number) <= 0)) {
      toast.error("Peso inválido");
      return;
    }

    addPhoto.mutate(
      {
        file,
        weight: parsedWeight,
        notes: notes.trim() || undefined,
        takenAt: date ? new Date(`${date}T12:00:00`).toISOString() : undefined,
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      }
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-sm"
          >
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Adicionar foto</h2>
              <button type="button" onClick={handleClose} aria-label="Fechar" title="Fechar" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="progress-photo-input" />
                <label
                  htmlFor="progress-photo-input"
                  className="cursor-pointer w-full h-40 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 overflow-hidden hover:border-[#007BFF]/40 transition-colors"
                >
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="Pré-visualização da foto de progresso" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera size={28} className="text-slate-300" />
                      <span className="text-sm text-slate-400">Toque para escolher uma foto</span>
                    </>
                  )}
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Data</label>
                  <input
                    type="date"
                    value={date}
                    max={todayInputValue()}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Observação</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                  placeholder="Ex: Primeira semana do plano"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={handleClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!file || addPhoto.isPending}
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#007BFF] to-[#28A745] text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addPhoto.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      <Upload size={14} /> Salvar foto
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
