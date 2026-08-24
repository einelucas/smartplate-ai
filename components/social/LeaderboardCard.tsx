"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Award, BarChart3 } from "lucide-react";
import { useRanking } from "@/hooks/useCommunity";
import type { RankingPeriod, RankingScope } from "@/types/community";

const POSITION_ICONS: Record<number, React.ReactNode> = {
  1: <Trophy className="text-amber-500" size={18} />,
  2: <Medal className="text-slate-400" size={18} />,
  3: <Award className="text-amber-700" size={18} />,
};

const PERIOD_TABS: { value: RankingPeriod; label: string }[] = [
  { value: "weekly", label: "Semana" },
  { value: "monthly", label: "Mês" },
  { value: "all", label: "Geral" },
];

const PERIOD_HEADING: Record<RankingPeriod, string> = {
  weekly: "Ranking Semanal",
  monthly: "Ranking Mensal",
  all: "Ranking Geral",
};

export default function LeaderboardCard({ scope: fixedScope, groupId }: { scope: "global" | "group"; groupId?: string }) {
  const [period, setPeriod] = useState<RankingPeriod>("weekly");
  // Só permite alternar Geral/Amigos quando o card não está travado num grupo
  // específico (uso na tela de um grupo sempre mostra só os membros dele).
  const [scope, setScope] = useState<RankingScope>(fixedScope === "group" ? "group" : "global");
  const effectiveScope: RankingScope = fixedScope === "group" ? "group" : scope;

  const { data, isLoading, isError } = useRanking(period, effectiveScope, groupId);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">{PERIOD_HEADING[period]}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {PERIOD_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setPeriod(tab.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  period === tab.value ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {fixedScope !== "group" && (
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {(["global", "friends"] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setScope(value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    scope === value ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {value === "global" ? "Geral" : "Amigos"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center text-sm text-slate-500 py-6">Não foi possível carregar o ranking agora.</div>
      ) : (data?.ranking ?? []).length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
            <BarChart3 className="text-slate-400" size={20} />
          </div>
          <p className="text-sm font-medium text-slate-600">Ninguém pontuou neste período ainda.</p>
          <p className="text-xs text-slate-400 mt-1">Complete uma refeição ou atividade para aparecer no ranking.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {(data?.ranking ?? []).map((entry, index) => {
              const isViewer = entry.userId === data?.viewerUserId;
              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`flex items-center gap-3 p-2 rounded-xl ${isViewer ? "bg-[#007BFF]/10 border border-[#007BFF]/20" : ""}`}
                >
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                    {POSITION_ICONS[entry.rank] || <span className="text-slate-400 font-medium text-sm">{entry.rank}</span>}
                  </div>
                  <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-500 flex-shrink-0 overflow-hidden">
                    {entry.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      entry.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${isViewer ? "text-[#007BFF]" : "text-slate-700"}`}>
                      {isViewer ? "Você" : entry.displayName}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-bold text-slate-800">{entry.xp}</span>
                    <span className="text-xs text-slate-400 ml-1">XP</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Sua posição — mesmo fora do Top N exibido acima */}
          {data?.viewer && !(data.ranking ?? []).some((entry) => entry.userId === data.viewerUserId) && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3 p-2 rounded-xl bg-[#007BFF]/10 border border-[#007BFF]/20">
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                <span className="text-[#007BFF] font-semibold text-sm">{data.viewer.rank}º</span>
              </div>
              <p className="flex-1 text-sm font-medium text-[#007BFF]">Você</p>
              <div className="text-right flex-shrink-0">
                <span className="font-bold text-slate-800">{data.viewer.xp}</span>
                <span className="text-xs text-slate-400 ml-1">XP</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
