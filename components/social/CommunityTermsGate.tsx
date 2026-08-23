// components/social/CommunityTermsGate.tsx
// Hook + modal reutilizável: garante aceite das Regras da Comunidade antes da
// primeira publicação/comentário. Uso: const { guard, modal } = useCommunityTermsGate();
// depois envolver a ação real em guard(() => ...).
"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useAcceptCommunityTerms, useCommunityMe } from "@/hooks/useCommunity";

export function useCommunityTermsGate() {
  const { data } = useCommunityMe();
  const acceptTerms = useAcceptCommunityTerms();
  const [showModal, setShowModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const hasAccepted = !!data?.profile?.termsAcceptedAt;

  const guard = useCallback(
    (action: () => void) => {
      if (hasAccepted) {
        action();
        return;
      }
      setPendingAction(() => action);
      setShowModal(true);
    },
    [hasAccepted]
  );

  const handleAccept = () => {
    acceptTerms.mutate(undefined, {
      onSuccess: () => {
        setShowModal(false);
        pendingAction?.();
        setPendingAction(null);
      },
    });
  };

  const modal = (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
          >
            <div className="w-12 h-12 bg-[#007BFF]/10 rounded-2xl flex items-center justify-center mb-4">
              <ShieldCheck size={22} className="text-[#007BFF]" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">Regras da Comunidade</h3>
            <p className="text-sm text-slate-500 mb-2">
              Antes de participar, confirme que você concorda com as regras: seja respeitoso, não
              compartilhe conselhos médicos ou de saúde perigosos, não faça spam e trate os outros
              membros com cuidado. Conteúdo denunciado pode ser removido pela moderação.
            </p>
            <Link href="/community/rules" target="_blank" className="text-xs text-[#007BFF] font-medium underline">
              Ler regras completas
            </Link>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAccept}
                disabled={acceptTerms.isPending}
                className="flex-1 bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {acceptTerms.isPending ? "..." : "Concordo e continuar"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return { guard, modal, hasAccepted };
}
