// components/HydrationCard.tsx
// Card de hidratação da Início — único ponto de registro rápido de água.
// Modais carregados sob demanda (mesmo padrão de RegisterActivityModal) pra
// não pesar o bundle inicial da rota mais visitada do app.
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Droplets, Plus, History, Settings2, Loader2, RefreshCw } from "lucide-react";
import { useHydrationSummary, useAddWaterLog } from "@/hooks/useHydration";

const HydrationCustomAmountModal = dynamic(() => import("./HydrationCustomAmountModal"), { ssr: false });
const HydrationGoalModal = dynamic(() => import("./HydrationGoalModal"), { ssr: false });
const HydrationHistoryModal = dynamic(() => import("./HydrationHistoryModal"), { ssr: false });

const QUICK_AMOUNTS = [250, 500];

export default function HydrationCard() {
  const { data: summary, isLoading, isError, refetch } = useHydrationSummary();
  const addWaterLog = useAddWaterLog();
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const totalMl = summary?.totalMl ?? 0;
  const goalMl = summary?.goalMl ?? 2500;
  const remainingMl = summary?.remainingMl ?? goalMl;
  const progressPercentage = summary?.progressPercentage ?? 0;
  const goalCompleted = summary?.goalCompleted ?? false;
  const overageMl = totalMl > goalMl ? totalMl - goalMl : 0;

  const isAdding = addWaterLog.isPending;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Droplets size={18} className="text-[#007BFF]" />
          Água
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHistoryModal(true)}
            title="Histórico"
            aria-label="Ver histórico de hidratação"
            className="p-1.5 text-slate-400 hover:text-[#007BFF] hover:bg-[#007BFF]/10 rounded-lg transition-colors"
          >
            <History size={16} />
          </button>
          <button
            onClick={() => setShowGoalModal(true)}
            title="Editar meta"
            aria-label="Editar meta diária de água"
            className="p-1.5 text-slate-400 hover:text-[#007BFF] hover:bg-[#007BFF]/10 rounded-lg transition-colors"
          >
            <Settings2 size={16} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3" aria-label="Carregando hidratação" role="status">
          <div className="h-7 w-32 bg-slate-100 rounded" />
          <div className="h-2 w-full bg-slate-100 rounded-full" />
          <div className="h-9 w-full bg-slate-100 rounded-xl" />
        </div>
      ) : (
        <>
          {isError && (
            <div className="mb-3 flex items-center justify-between gap-2 bg-red-50 text-red-600 text-xs rounded-lg px-3 py-2">
              <span>Não foi possível atualizar os dados de hoje.</span>
              <button onClick={() => refetch()} className="flex items-center gap-1 font-semibold hover:underline flex-shrink-0">
                <RefreshCw size={12} />
                Tentar de novo
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 mb-1">
            <span className="text-2xl font-bold text-slate-800">{totalMl.toLocaleString("pt-BR")}</span>
            <span className="text-slate-400 text-sm mb-0.5">/ {goalMl.toLocaleString("pt-BR")} ml</span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            {goalCompleted
              ? overageMl > 0
                ? `Meta atingida! +${overageMl.toLocaleString("pt-BR")} ml acima da meta`
                : "Meta atingida hoje 🎉"
              : `Faltam ${remainingMl.toLocaleString("pt-BR")} ml`}
          </p>

          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4" role="progressbar" aria-valuenow={progressPercentage} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da meta diária de água">
            <motion.div
              initial={false}
              animate={{ width: `${progressPercentage}%` }}
              className={`h-full rounded-full transition-colors ${goalCompleted ? "bg-[#28A745]" : "bg-gradient-to-r from-[#007BFF] to-[#28A745]"}`}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => addWaterLog.mutate({ amountMl: amount })}
                disabled={isAdding}
                aria-label={`Adicionar ${amount} ml de água`}
                className="flex-1 min-w-[84px] flex items-center justify-center gap-1 bg-[#007BFF]/10 hover:bg-[#007BFF]/20 text-[#007BFF] text-sm font-medium rounded-xl py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAdding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {amount} ml
              </button>
            ))}
            <button
              onClick={() => setShowCustomModal(true)}
              disabled={isAdding}
              className="flex-1 min-w-[84px] flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-medium rounded-xl py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Outro valor
            </button>
          </div>
        </>
      )}

      <HydrationCustomAmountModal isOpen={showCustomModal} onClose={() => setShowCustomModal(false)} />
      <HydrationGoalModal isOpen={showGoalModal} onClose={() => setShowGoalModal(false)} currentGoalMl={goalMl} />
      {showHistoryModal && <HydrationHistoryModal onClose={() => setShowHistoryModal(false)} />}
    </div>
  );
}
