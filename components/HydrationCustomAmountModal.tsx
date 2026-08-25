// components/HydrationCustomAmountModal.tsx
// Modal de "Outro valor" do card de hidratação — nunca fecha silenciosamente
// em caso de erro de validação; a mensagem fica visível até o usuário corrigir.
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Droplets } from "lucide-react";
import { useAddWaterLog } from "@/hooks/useHydration";
import { WATER_LOG_MAX_ML, WATER_LOG_MIN_ML } from "@/lib/hydration/validation";

export default function HydrationCustomAmountModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const addWaterLog = useAddWaterLog();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isSaving = addWaterLog.isPending;

  const handleClose = () => {
    if (isSaving) return;
    setAmount("");
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const trimmed = amount.trim();
    const value = Number(trimmed);
    if (!trimmed || !Number.isInteger(value)) {
      setError("Informe uma quantidade inteira em ml.");
      return;
    }
    if (value < WATER_LOG_MIN_ML || value > WATER_LOG_MAX_ML) {
      setError(`A quantidade deve estar entre ${WATER_LOG_MIN_ML} e ${WATER_LOG_MAX_ML.toLocaleString("pt-BR")} ml.`);
      return;
    }

    setError(null);
    addWaterLog.mutate(
      { amountMl: value },
      {
        onSuccess: () => {
          setAmount("");
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
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-sm"
          >
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Droplets size={18} className="text-[#007BFF]" />
                Registrar quantidade
              </h2>
              <button type="button" onClick={handleClose} aria-label="Fechar" title="Fechar" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <label htmlFor="hydration-custom-amount" className="block text-sm font-medium text-slate-700">
                Quantidade (ml)
              </label>
              <div className="relative">
                <input
                  id="hydration-custom-amount"
                  type="number"
                  inputMode="numeric"
                  autoFocus
                  min={WATER_LOG_MIN_ML}
                  max={WATER_LOG_MAX_ML}
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Ex.: 300"
                  aria-invalid={!!error}
                  aria-describedby={error ? "hydration-custom-amount-error" : undefined}
                  className={`w-full px-3 py-2.5 pr-10 border rounded-xl text-sm focus:outline-none focus:ring-2 ${
                    error ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:ring-[#007BFF]/30"
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">ml</span>
              </div>
              {error && (
                <p id="hydration-custom-amount-error" role="alert" className="text-xs text-red-500">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-[#007BFF] hover:bg-[#0056b3] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                  Confirmar
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
