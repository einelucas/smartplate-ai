// components/admin/RevokePremiumGrantModal.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldOff } from "lucide-react";
import { useRevokePremiumGrant } from "@/hooks/useAdmin";
import type { PremiumGrantAdminRow } from "@/types/admin";

const SOURCE_LABELS: Record<string, string> = {
  BETA_CODE: "Código Beta",
  PROMO_CODE: "Código promocional",
  ADMIN: "Concessão administrativa",
};

export default function RevokePremiumGrantModal({ grant, onClose }: { grant: PremiumGrantAdminRow; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const revoke = useRevokePremiumGrant();

  const submit = () => {
    if (reason.trim().length < 3) return;
    revoke.mutate({ id: grant.id, reason: reason.trim() }, { onSuccess: onClose });
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
              <ShieldOff size={18} className="text-red-500" />
              <h3 className="font-bold text-slate-800">Revogar Premium?</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs text-slate-600 space-y-1">
            <p>
              <span className="text-slate-400">Usuário: </span>
              {grant.user?.username ? `@${grant.user.username}` : grant.user?.email ?? grant.userId}
            </p>
            <p>
              <span className="text-slate-400">Origem: </span>
              {SOURCE_LABELS[grant.source] ?? grant.source}
            </p>
            <p>
              <span className="text-slate-400">Expira em: </span>
              {new Date(grant.expiresAt).toLocaleString("pt-BR")}
            </p>
          </div>

          <label className="block mb-4">
            <span className="text-xs font-medium text-slate-500">Motivo da revogação</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="Ex.: código Beta gerado por engano"
              className="mt-1 w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-700 resize-none"
              rows={3}
            />
          </label>

          {revoke.isError && <p className="text-xs text-red-500 mb-3">{revoke.error.message}</p>}

          <button
            onClick={submit}
            disabled={revoke.isPending || reason.trim().length < 3}
            className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {revoke.isPending ? "Revogando..." : "Revogar Premium"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
