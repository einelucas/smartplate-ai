// components/social/SharePlanModal.tsx
// Compartilha um plano alimentar salvo na Comunidade. Reutiliza a API de
// compartilhamento já existente (POST /api/meal-plans/[id]/share) — nunca
// aceita um mealPlanId de outro usuário, o token é sempre gerado no servidor
// a partir de um plano que pertence ao autor autenticado.
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UtensilsCrossed } from "lucide-react";
import toast from "react-hot-toast";
import { useCreatePost } from "@/hooks/useCommunity";

type SavedPlan = { id: string; name: string | null; dietType: string; calories: number };

export default function SharePlanModal({ groupId, onClose }: { groupId?: string; onClose: () => void }) {
  const [plans, setPlans] = useState<SavedPlan[] | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const createPost = useCreatePost(groupId);

  useEffect(() => {
    fetch("/api/meal-plans")
      .then((res) => res.json())
      .then((data) => setPlans(data.plans ?? []))
      .catch(() => setPlans([]));
  }, []);

  const handleShare = async () => {
    if (!selectedPlanId) return;
    setIsSharing(true);
    try {
      const shareRes = await fetch(`/api/meal-plans/${selectedPlanId}/share`, { method: "POST" });
      const shareData = await shareRes.json();
      if (!shareRes.ok) throw new Error(shareData.error || "Erro ao compartilhar plano");

      createPost.mutate(
        { type: "PLAN_SHARE", shareToken: shareData.shareToken, text: caption.trim() || undefined },
        { onSuccess: onClose }
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao compartilhar plano");
    } finally {
      setIsSharing(false);
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
            <h3 className="font-bold text-slate-800">Compartilhar plano</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          {plans === null && <p className="text-sm text-slate-400">Carregando seus planos...</p>}
          {plans?.length === 0 && <p className="text-sm text-slate-500">Você ainda não tem planos salvos.</p>}

          <div className="space-y-2 max-h-52 overflow-y-auto mb-3">
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

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 500))}
            placeholder="Escreva algo sobre este plano (opcional)"
            rows={2}
            className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none mb-4"
          />

          <button
            onClick={handleShare}
            disabled={!selectedPlanId || isSharing || createPost.isPending}
            className="w-full bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {isSharing || createPost.isPending ? "Compartilhando..." : "Compartilhar na Comunidade"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
