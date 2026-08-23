// components/social/LeaderboardCard.tsx
"use client";

import { motion } from "framer-motion";
import { Trophy, Medal, Award, BarChart3 } from "lucide-react";
import { useRanking } from "@/hooks/useCommunity";

const POSITION_ICONS: Record<number, React.ReactNode> = {
  1: <Trophy className="text-amber-500" size={18} />,
  2: <Medal className="text-slate-400" size={18} />,
  3: <Award className="text-amber-700" size={18} />,
};

export default function LeaderboardCard({ scope, groupId }: { scope: "global" | "group"; groupId?: string }) {
  const { data, isLoading, isError } = useRanking(scope, groupId);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3 animate-pulse">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-slate-100 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center text-sm text-slate-500">
        Não foi possível carregar o ranking agora.
      </div>
    );
  }

  const ranking = data?.ranking ?? [];
  const viewerUserId = data?.viewerUserId;

  if (ranking.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
        <div className="w-12 h-12 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
          <BarChart3 className="text-slate-400" size={20} />
        </div>
        <p className="text-sm font-medium text-slate-600">Ninguém pontuou nesta semana ainda.</p>
        <p className="text-xs text-slate-400 mt-1">Complete uma refeição para aparecer no ranking.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-slate-800">Ranking Semanal</h3>
        <span className="text-xs text-slate-400">seg a dom</span>
      </div>

      <div className="space-y-2">
        {ranking.map((entry, index) => {
          const isViewer = entry.userId === viewerUserId;
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
                <span className="font-bold text-slate-800">{entry.weeklyXp}</span>
                <span className="text-xs text-slate-400 ml-1">XP</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
