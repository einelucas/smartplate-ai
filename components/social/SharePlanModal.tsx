// components/social/SharePlanModal.tsx
// Seletor de refeição/plano pro attachment MEAL do PostComposer. NÃO publica
// nada — só gera o token de compartilhamento (API já existente) e devolve
// pro Composer via onSelect. Texto/imagem/destino ficam só no Composer.
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UtensilsCrossed, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import type { PostAttachment } from "@/lib/community/post-draft";

type SavedPlan = { id: string; name: string | null; dietType: string; calories: number };

export default function SharePlanModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (attachment: Extract<PostAttachment, { type: "MEAL" }>) => void;
}) {
  const [plans, setPlans] = useState<SavedPlan[] | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    fetch("/api/meal-plans")
      .then((res) => res.json())
      .then((data) => setPlans(data.plans ?? []))
      .catch(() => setPlans([]));
  }, []);

  const handleAdd = async () => {
    if (!selectedPlanId) return;
    const plan = plans?.find((p) => p.id === selectedPlanId);
    setIsResolving(true);
    try {
      const shareRes = await fetch(`/api/meal-plans/${selectedPlanId}/share`, { method: "POST" });
      const shareData = await shareRes.json();
      if (!shareRes.ok) throw new Error(shareData.error || "Erro ao preparar o plano");
      onSelect({ type: "MEAL", shareToken: shareData.shareToken, planName: plan?.name, dietType: plan?.dietType });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao preparar o plano");
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
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
            <h3 className="font-bold text-slate-800">Anexar refeição</h3>
            <button onClick={onClose} aria-label="Fechar" className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          {plans === null && <p className="text-sm text-slate-400">Carregando seus planos...</p>}
          {plans?.length === 0 && <p className="text-sm text-slate-500">Você ainda não tem planos salvos.</p>}

          <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
            {plans?.map((plan) => (
              <label
                key={plan.id}
                className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer ${
                  selectedPlanId === plan.id ? "border-[#007BFF] bg-[#007BFF]/5" : "border-slate-200"
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  checked={selectedPlanId === plan.id}
                  onChange={() => setSelectedPlanId(plan.id)}
                  className="accent-[#007BFF]"
                />
                <UtensilsCrossed size={16} className="text-[#28A745] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{plan.name || "Plano sem nome"}</p>
                  <p className="text-xs text-slate-400">
                    {plan.dietType} · {plan.calories} kcal
                  </p>
                </div>
              </label>
            ))}
          </div>

          <button
            onClick={handleAdd}
            disabled={!selectedPlanId || isResolving}
            className="w-full flex items-center justify-center gap-2 bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {isResolving && <Loader2 size={14} className="animate-spin" />}
            Adicionar ao post
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
