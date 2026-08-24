// components/ActivitySummaryCard.tsx
// Resumo de atividade física no Perfil — mês local + consistência (dias
// ativos), com acesso ao histórico completo e ao registro rápido.
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Activity as ActivityIcon } from "lucide-react";
import { useActivitySummary } from "@/hooks/useActivities";
import { useActivityHistory } from "@/hooks/useActivityHistory";
import { getProviderDisplay } from "@/lib/integrations/provider-display";

const RegisterActivityModal = dynamic(() => import("./RegisterActivityModal"), { ssr: false });
const ActivityHistoryModal = dynamic(() => import("./ActivityHistoryModal"), { ssr: false });

export default function ActivitySummaryCard() {
  const { data: summary, isLoading, isError } = useActivitySummary();
  // Só para exibir a contagem Strava separadamente (item 10) — NUNCA somada
  // às métricas de gamificação acima, que continuam vindo só de ActivityLog.
  const { externalItems } = useActivityHistory();
  const [showRegister, setShowRegister] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <ActivityIcon size={18} className="text-[#007BFF]" />
          Atividade física
        </h3>
      </div>

      {isLoading && (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-slate-100 rounded w-1/3" />
          <div className="h-6 bg-slate-100 rounded w-1/2" />
        </div>
      )}

      {isError && !isLoading && <p className="text-sm text-slate-400 text-center py-4">Não foi possível carregar suas atividades.</p>}

      {!isLoading && !isError && summary && (
        <>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Este mês no SmartPlate</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{summary.thisMonth.count} atividades</p>
          <p className="text-sm text-slate-500">{summary.thisMonth.minutes} min ativos</p>
          <p className="text-sm text-slate-500 mt-0.5">{summary.thisMonth.distinctDays} dias ativos este mês</p>

          {externalItems.length > 0 && (
            <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">
              {getProviderDisplay(externalItems[0].source).label} • {externalItems.length} atividade
              {externalItems.length === 1 ? "" : "s"} sincronizada{externalItems.length === 1 ? "" : "s"} recentemente
            </p>
          )}

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setShowHistory(true)}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Ver histórico
            </button>
            <button
              onClick={() => setShowRegister(true)}
              className="flex-1 py-2.5 bg-[#007BFF] hover:bg-[#0056b3] rounded-xl text-white text-sm font-medium transition-colors"
            >
              Registrar atividade
            </button>
          </div>
        </>
      )}

      <RegisterActivityModal isOpen={showRegister} onClose={() => setShowRegister(false)} />
      {showHistory && <ActivityHistoryModal onClose={() => setShowHistory(false)} />}
    </div>
  );
}
