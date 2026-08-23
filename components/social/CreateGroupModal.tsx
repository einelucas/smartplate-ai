// components/social/CreateGroupModal.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useCreateGroup } from "@/hooks/useCommunity";

export default function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createGroup = useCreateGroup();

  const submit = () => {
    if (name.trim().length < 2) return;
    createGroup.mutate({ name: name.trim(), description: description.trim() || undefined }, { onSuccess: onClose });
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
            <h3 className="font-bold text-slate-800">Criar grupo</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 60))}
              placeholder="Nome do grupo"
              className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 300))}
              placeholder="Descrição (opcional)"
              rows={3}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none resize-none"
            />
          </div>

          <button
            onClick={submit}
            disabled={createGroup.isPending || name.trim().length < 2}
            className="w-full mt-5 bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {createGroup.isPending ? "Criando..." : "Criar grupo"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
