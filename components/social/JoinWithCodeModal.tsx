// components/social/JoinWithCodeModal.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useJoinGroupByCode } from "@/hooks/useCommunity";

export default function JoinWithCodeModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const joinGroup = useJoinGroupByCode();

  const submit = () => {
    if (code.trim().length < 4) return;
    joinGroup.mutate(code.trim(), { onSuccess: onClose });
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
            <h3 className="font-bold text-slate-800">Entrar com código</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 32))}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Código de convite"
            className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none tracking-widest uppercase"
          />

          <button
            onClick={submit}
            disabled={joinGroup.isPending || code.trim().length < 4}
            className="w-full mt-5 bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {joinGroup.isPending ? "Entrando..." : "Entrar no grupo"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
