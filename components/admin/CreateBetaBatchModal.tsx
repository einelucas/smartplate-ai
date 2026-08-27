// components/admin/CreateBetaBatchModal.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Ticket } from "lucide-react";
import { useCreateBetaBatch } from "@/hooks/useAdmin";
import type { CreateBetaBatchResult } from "@/types/admin";

export default function CreateBetaBatchModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (result: CreateBetaBatchResult) => void;
}) {
  const [quantity, setQuantity] = useState(25);
  const [durationDays, setDurationDays] = useState(90);
  const [redeemUntil, setRedeemUntil] = useState("");
  const createBatch = useCreateBetaBatch();

  const submit = () => {
    createBatch.mutate(
      {
        quantity,
        durationDays,
        redeemUntil: redeemUntil ? new Date(`${redeemUntil}T23:59:59`).toISOString() : undefined,
      },
      { onSuccess: onCreated }
    );
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
              <Ticket size={18} className="text-orange-500" />
              <h3 className="font-bold text-slate-800">Criar lote de códigos Beta</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4 mb-5">
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Quantidade</span>
              <input
                type="number"
                min={1}
                max={500}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="mt-1 w-full border border-slate-200 rounded-xl p-2.5 text-sm text-slate-700"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Duração do Premium (dias)</span>
              <input
                type="number"
                min={1}
                max={365}
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="mt-1 w-full border border-slate-200 rounded-xl p-2.5 text-sm text-slate-700"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Data limite para resgate (opcional)</span>
              <input
                type="date"
                value={redeemUntil}
                onChange={(e) => setRedeemUntil(e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-xl p-2.5 text-sm text-slate-700"
              />
            </label>
          </div>

          {createBatch.isError && <p className="text-xs text-red-500 mb-3">{createBatch.error.message}</p>}

          <button
            onClick={submit}
            disabled={createBatch.isPending || quantity < 1 || durationDays < 1}
            className="w-full bg-[#007BFF] hover:bg-[#0069d9] text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {createBatch.isPending ? "Criando..." : `Criar ${quantity} código${quantity === 1 ? "" : "s"}`}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
