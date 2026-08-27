// components/social/GroupStatsPanel.tsx
// Estatísticas agregadas do grupo — leitura pura (sem novo model de
// escrita), janela semanal uniforme (mesma do ranking geral).
"use client";

import { Activity, UtensilsCrossed, Users2 } from "lucide-react";
import { useGroupStats } from "@/hooks/useCommunity";

export default function GroupStatsPanel({ groupId }: { groupId: string }) {
  const { data, isLoading } = useGroupStats(groupId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    {
      icon: Users2,
      color: "text-[#007BFF]",
      bg: "bg-[#007BFF]/10",
      value: `${data.activeMemberCount}/${data.memberCount}`,
      label: "Membros ativos esta semana",
    },
    {
      icon: Activity,
      color: "text-orange-500",
      bg: "bg-orange-50",
      value: data.activityCount,
      label: "Atividades registradas esta semana",
    },
    {
      icon: UtensilsCrossed,
      color: "text-[#28A745]",
      bg: "bg-[#28A745]/10",
      value: data.mealsCompletedCount,
      label: "Refeições concluídas esta semana",
    },
  ];

  return (
    <div className="max-w-2xl">
      <p className="text-xs text-slate-400 mb-3">Semana atual (segunda a domingo, UTC) — soma de todos os membros do grupo.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center mb-3`}>
              <card.icon size={18} className={card.color} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
