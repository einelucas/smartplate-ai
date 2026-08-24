// components/BetaCodeRedeemModal.tsx
// Resgate de Código Beta FORA do onboarding (usuário que pulou). Reusa
// exatamente o mesmo backend do onboarding (POST /api/beta/redeem via
// hooks/useBetaCode.ts) — normalização, validação, idempotência,
// concorrência e PremiumGrant já vivem lá, nada duplicado aqui.
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FlaskConical, Loader2, PartyPopper } from "lucide-react";
import { useRedeemBetaCode } from "@/hooks/useBetaCode";

function formatExpiryDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function BetaCodeRedeemModal({ onClose }: { onClose: () => void }) {
  const redeem = useRedeemBetaCode();
  const [code, setCode] = useState("");
  const [successExpiresAt, setSuccessExpiresAt] = useState<string | null>(null);

  const handleRedeem = () => {
    if (!code.trim() || redeem.isPending) return;
    redeem.mutate(code.trim(), {
      onSuccess: (data) => {
        if (data.expiresAt) setSuccessExpiresAt(data.expiresAt);
      },
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Ativar acesso Beta</h3>
            <button onClick={onClose} aria-label="Fechar" className="p-2 -m-2 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          {successExpiresAt ? (
            <div className="rounded-2xl bg-gradient-to-br from-[#28A745]/10 to-[#007BFF]/10 border border-[#28A745]/30 p-5 flex items-start gap-3">
              <PartyPopper size={22} className="text-[#28A745] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-800">Código Beta ativado!</p>
                <p className="text-sm text-slate-600 mt-1">Você recebeu acesso Premium Beta.</p>
                <p className="text-xs text-slate-500 mt-1">Acesso até {formatExpiryDate(successExpiresAt)}.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center text-center gap-2 py-2 mb-3">
                <div className="w-14 h-14 rounded-2xl bg-[#007BFF]/10 flex items-center justify-center">
                  <FlaskConical size={26} className="text-[#007BFF]" />
                </div>
              </div>

              <label className="block text-xs font-medium text-slate-500 mb-1.5">Código Beta</label>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 32))}
                  onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
                  placeholder="SPBETA-XXXX-XXXX-XXXX"
                  autoFocus
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF] font-mono text-sm tracking-wide"
                />
              </div>
              {redeem.isError && <p className="text-xs text-red-500 mt-1.5">{redeem.error.message}</p>}

              <button
                type="button"
                onClick={handleRedeem}
                disabled={!code.trim() || redeem.isPending}
                className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-[#007BFF] hover:bg-[#0056b3] rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              >
                {redeem.isPending && <Loader2 size={14} className="animate-spin" />}
                Ativar código
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
