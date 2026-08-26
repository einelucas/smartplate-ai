// components/social/ChallengeRankingModal.tsx
// Ranking interno de um desafio — progresso/percentual, concluídos primeiro
// (desempate por tempo de conclusão), + progresso coletivo para desafios de
// grupo (checklist seção 7, itens 21/22/26).
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Users2 } from "lucide-react";
import { useChallengeRanking } from "@/hooks/useCommunity";
import Avatar from "./Avatar";

export default function ChallengeRankingModal({
  challengeId,
  title,
  onClose,
}: {
  challengeId: string;
  title: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useChallengeRanking(challengeId);

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto"
        >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Ranking do desafio</p>
              <h3 className="font-semibold text-slate-800 truncate">{title}</h3>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg flex-shrink-0">
              <X size={18} />
            </button>
          </div>

          <div className="p-4">
            {data?.collective && (
              <div className="mb-4 bg-[#007BFF]/5 border border-[#007BFF]/20 rounded-xl p-3 flex items-center gap-3">
                <Users2 size={18} className="text-[#007BFF] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Progresso do grupo</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {data.collective.progress}/{data.collective.target} ({data.collective.participantCount} participante{data.collective.participantCount === 1 ? "" : "s"})
                  </p>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-10 bg-slate-100 rounded-xl" />
                ))}
              </div>
            ) : (data?.ranking ?? []).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Ninguém entrou neste desafio ainda.</p>
            ) : (
              <div className="space-y-2">
                {(data?.ranking ?? []).map((entry) => (
                  <div key={entry.userId} className="flex items-center gap-3 p-2 rounded-xl">
                    <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                      {entry.completedAt ? <Trophy size={16} className="text-amber-500" /> : <span className="text-slate-400 text-sm font-medium">{entry.rank}</span>}
                    </div>
                    <Avatar avatarUrl={entry.avatarUrl} name={entry.displayName} sizeClassName="w-8 h-8" textSizeClassName="text-xs" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{entry.displayName}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-800 flex-shrink-0">
                      {entry.completedAt ? "100%" : `${entry.percentage}%`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
