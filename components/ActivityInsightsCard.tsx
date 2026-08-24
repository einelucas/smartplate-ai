// components/ActivityInsightsCard.tsx
// Insights privados de atividade (determinísticos + IA, com fallback — ver
// lib/activity/insights.ts). NUNCA publicado na Comunidade, nunca visível
// para amigos, sem botão Compartilhar (checklist itens 45-46).
"use client";

import { Sparkles, Lock } from "lucide-react";
import { useActivityInsights } from "@/hooks/useActivityInsights";

export default function ActivityInsightsCard() {
  const { data, isLoading, isError } = useActivityInsights();

  if (isLoading) {
    return <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-32 animate-pulse" />;
  }

  // Nunca quebra a página por causa de IA/insights — só some a seção.
  if (isError || !data || data.insights.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Sparkles size={18} className="text-[#28A745]" /> Insights da sua rotina
        </h3>
        <span className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
          <Lock size={11} /> Privado
        </span>
      </div>
      <div className="space-y-2.5">
        {data.insights.map((line, i) => (
          <p key={i} className="text-sm text-slate-600 leading-relaxed">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
