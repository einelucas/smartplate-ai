// components/HydrationCard.tsx
// Card de hidratação da Início — único ponto de registro rápido de água.
// Modais carregados sob demanda (mesmo padrão de RegisterActivityModal) pra
// não pesar o bundle inicial da rota mais visitada do app.
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Plus, History, Settings2, Loader2, RefreshCw } from "lucide-react";
import { useHydrationSummary, useAddWaterLog } from "@/hooks/useHydration";
import styles from "./HomeDashboard.module.css";

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
    <div className={styles.card}>
      <div className={styles.sectionHead}>
        <h2>Água hoje</h2>
        <span className={styles.waterAmount}>{summary ? (totalMl/1000).toLocaleString("pt-BR",{maximumFractionDigits:2}) + " de " + (goalMl/1000).toLocaleString("pt-BR",{maximumFractionDigits:2}) + " L" : "—"}</span>
        <div className={styles.waterActions}>
          <button
            onClick={() => setShowHistoryModal(true)}
            title="Histórico"
            aria-label="Ver histórico de hidratação"
            className={styles.waterAction}
          >
            <History size={16} />
          </button>
          <button
            onClick={() => setShowGoalModal(true)}
            title="Editar meta"
            aria-label="Editar meta diária de água"
            className={styles.waterAction}
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

          <p className="text-xs text-slate-500 mb-3">
            {goalCompleted
              ? overageMl > 0
                ? `Meta atingida! +${overageMl.toLocaleString("pt-BR")} ml acima da meta`
                : "Meta atingida hoje 🎉"
              : `Faltam ${remainingMl.toLocaleString("pt-BR")} ml`}
          </p>

          <div className={styles.waterTrack} role="progressbar" aria-valuenow={progressPercentage} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da meta diária de água">
            {Array.from({length:12},(_,i)=><i key={i}><b style={{width:Math.max(0,Math.min(1,progressPercentage/100*12-i))*100+"%"}}/></i>)}
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => addWaterLog.mutate({ amountMl: amount })}
                disabled={isAdding}
                aria-label={`Adicionar ${amount} ml de água`}
                className={styles.waterQuick}
              >
                {isAdding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {amount} ml
              </button>
            ))}
            <button
              onClick={() => setShowCustomModal(true)}
              disabled={isAdding}
              className={styles.waterQuick}
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
