// components/ActivitySummaryCard.tsx
// Dashboard de atividade no Perfil — mês local (atividades/minutos/dias/tipo
// mais praticado), histórico e registro rápido. Dados 100% reais via
// lib/activity/stats.ts (mesma fonte usada pelo Início). Nunca um painel
// morto com "0 atividades" quando não há dados — ver estado vazio abaixo.
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Activity as ActivityIcon } from "lucide-react";
import { useActivitySummary } from "@/hooks/useActivities";
import { useActivityHistory } from "@/hooks/useActivityHistory";
import { getProviderDisplay } from "@/lib/integrations/provider-display";
import { ACTIVITY_TYPE_ICON_KEY, findActivityTypeLabel } from "@/lib/activity/options";
import { resolveIcon } from "@/components/icon-registry";

const RegisterActivityModal = dynamic(() => import("./RegisterActivityModal"), { ssr: false });
const ActivityHistoryModal = dynamic(() => import("./ActivityHistoryModal"), { ssr: false });

export default function ActivitySummaryCard() {
  const { data: summary, isLoading, isError } = useActivitySummary();
  // Só para exibir a contagem Strava separadamente — NUNCA somada às
  // métricas de gamificação acima, que continuam vindo só de ActivityLog.
  const { externalItems } = useActivityHistory();
  const [showRegister, setShowRegister] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const hasActivityThisMonth = (summary?.thisMonth.count ?? 0) > 0;
  const mostPracticed = summary?.thisMonth.mostPracticed ?? null;
  const MostPracticedIcon = mostPracticed ? resolveIcon(ACTIVITY_TYPE_ICON_KEY[mostPracticed.type]) : null;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <ActivityIcon size={18} className="text-[#007BFF]" />
          Atividade física
        </h3>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 animate-pulse">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl" />
          ))}
        </div>
      )}

      {isError && !isLoading && <p className="text-sm text-slate-400 text-center py-4">Não foi possível carregar suas atividades.</p>}

      {!isLoading && !isError && summary && (
        <>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Este mês</p>

          {!hasActivityThisMonth ? (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl mb-4">
              <p className="text-sm text-slate-500">Você ainda não registrou atividades este mês.</p>
              <button
                onClick={() => setShowRegister(true)}
                className="mt-3 px-4 py-2.5 bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl text-sm font-semibold min-h-[44px]"
              >
                Registrar atividade
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xl font-bold text-slate-800">{summary.thisMonth.count}</p>
                <p className="text-xs text-slate-500">Atividades</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xl font-bold text-slate-800">{summary.thisMonth.minutes} min</p>
                <p className="text-xs text-slate-500">Minutos ativos</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xl font-bold text-slate-800">{summary.thisMonth.distinctDays}</p>
                <p className="text-xs text-slate-500">Dias ativos</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2 min-w-0">
                {MostPracticedIcon && <MostPracticedIcon size={20} weight="duotone" className="text-[#007BFF] flex-shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{mostPracticed ? findActivityTypeLabel(mostPracticed.type) : "—"}</p>
                  <p className="text-xs text-slate-500">Mais praticada</p>
                </div>
              </div>
            </div>
          )}

          {externalItems.length > 0 && (
            <p className="text-xs text-slate-400 mb-4 pt-3 border-t border-slate-100">
              {getProviderDisplay(externalItems[0].source).label} • {externalItems.length} atividade
              {externalItems.length === 1 ? "" : "s"} sincronizada{externalItems.length === 1 ? "" : "s"} recentemente
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowHistory(true)}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors min-h-[44px]"
            >
              Ver histórico
            </button>
            <button
              onClick={() => setShowRegister(true)}
              className="flex-1 py-2.5 bg-[#007BFF] hover:bg-[#0056b3] rounded-xl text-white text-sm font-medium transition-colors min-h-[44px]"
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
