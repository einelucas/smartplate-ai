// components/ActivityGoalsCard.tsx
// Metas semanais de atividade + progresso real (nunca persistido/editável —
// sempre recalculado de ActivityLog, ver lib/activity/goals.ts) + "sequência
// de semanas ativas" (conceito próprio, nunca o streak geral do SmartPlate).
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Target, Pencil, Trash2, Flame } from "lucide-react";
import { useActivityGoals, useDeleteActivityGoal, type ActivityGoal, type ActivityGoalMetric } from "@/hooks/useActivityGoals";

const ActivityGoalModal = dynamic(() => import("./ActivityGoalModal"), { ssr: false });

const METRIC_LABELS: Record<ActivityGoalMetric, { label: string; unit: (n: number) => string }> = {
  ACTIVE_DAYS: { label: "Dias ativos", unit: (n) => `${n} ${n === 1 ? "dia" : "dias"}` },
  ACTIVITY_MINUTES: { label: "Minutos ativos", unit: (n) => `${n} min` },
  ACTIVITY_COUNT: { label: "Atividades", unit: (n) => `${n}` },
};

export default function ActivityGoalsCard() {
  const { data, isLoading } = useActivityGoals();
  const deleteGoal = useDeleteActivityGoal();
  const [showModal, setShowModal] = useState(false);
  const [editMetric, setEditMetric] = useState<ActivityGoalMetric | undefined>(undefined);

  const activeGoals = (data?.goals ?? []).filter((g: ActivityGoal) => g.isActive);

  const openModal = (metric?: ActivityGoalMetric) => {
    setEditMetric(metric);
    setShowModal(true);
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Target size={18} className="text-[#007BFF]" /> Metas semanais
        </h3>
        {!!data?.streak.weeks && (
          <span className="flex items-center gap-1 text-xs font-semibold text-orange-500 bg-orange-50 px-2.5 py-1 rounded-full flex-shrink-0">
            <Flame size={12} /> {data.streak.weeks} {data.streak.weeks === 1 ? "semana ativa" : "semanas ativas"}
          </span>
        )}
      </div>

      {isLoading && <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />}

      {!isLoading && activeGoals.length === 0 && (
        <div className="text-center py-6">
          <p className="text-sm text-slate-500">Defina uma meta de atividade para acompanhar sua semana.</p>
          <button
            onClick={() => openModal()}
            className="mt-3 px-4 py-2.5 bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl text-sm font-semibold min-h-[44px]"
          >
            Criar meta
          </button>
        </div>
      )}

      {!isLoading && activeGoals.length > 0 && (
        <div className="space-y-4">
          {activeGoals.map((goal) => {
            const meta = METRIC_LABELS[goal.metric];
            return (
              <div key={goal.id}>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <span className="text-sm font-medium text-slate-700 truncate">{meta.label}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {meta.unit(goal.progress.current)} / {meta.unit(goal.target)}
                    </span>
                    <button
                      onClick={() => openModal(goal.metric)}
                      aria-label={`Editar meta de ${meta.label.toLowerCase()}`}
                      className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-[#007BFF] hover:bg-slate-50 rounded-lg"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remover meta de ${meta.label.toLowerCase()}?`)) deleteGoal.mutate(goal.id);
                      }}
                      aria-label={`Remover meta de ${meta.label.toLowerCase()}`}
                      className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#007BFF] to-[#28A745] rounded-full transition-all"
                    style={{ width: `${goal.progress.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}

          <button
            onClick={() => openModal()}
            className="w-full mt-1 py-2.5 border border-dashed border-slate-200 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 min-h-[44px]"
          >
            + Nova meta
          </button>
        </div>
      )}

      {showModal && <ActivityGoalModal existingGoals={data?.goals ?? []} initialMetric={editMetric} onClose={() => setShowModal(false)} />}
    </div>
  );
}
