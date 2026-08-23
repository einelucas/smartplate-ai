// components/social/GroupInviteModal.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, RefreshCcw } from "lucide-react";
import toast from "react-hot-toast";
import { useRegenerateInviteCode } from "@/hooks/useCommunity";

export default function GroupInviteModal({
  groupId,
  inviteCode,
  canRegenerate,
  onClose,
}: {
  groupId: string;
  inviteCode: string;
  canRegenerate: boolean;
  onClose: () => void;
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const regenerate = useRegenerateInviteCode(groupId);

  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/community/invite/${inviteCode}` : "";

  const copy = async (text: string, setFlag: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setFlag(true);
      setTimeout(() => setFlag(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
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
            <h3 className="font-bold text-slate-800">Convidar para o grupo</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <p className="text-xs text-slate-500 mb-1">Código de convite</p>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 bg-slate-100 rounded-xl px-3 py-2.5 font-mono text-sm tracking-widest text-slate-700">
              {inviteCode}
            </div>
            <button onClick={() => copy(inviteCode, setCopiedCode)} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600">
              {copiedCode ? <Check size={16} className="text-[#28A745]" /> : <Copy size={16} />}
            </button>
          </div>

          <p className="text-xs text-slate-500 mb-1">Link de convite</p>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 bg-slate-100 rounded-xl px-3 py-2.5 text-xs text-slate-600 truncate">{inviteUrl}</div>
            <button onClick={() => copy(inviteUrl, setCopiedLink)} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600">
              {copiedLink ? <Check size={16} className="text-[#28A745]" /> : <Copy size={16} />}
            </button>
          </div>

          {canRegenerate && (
            <button
              onClick={() => regenerate.mutate()}
              disabled={regenerate.isPending}
              className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
            >
              <RefreshCcw size={14} /> Gerar novo código
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
