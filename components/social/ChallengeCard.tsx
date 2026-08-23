// components/social/ChallengeCard.tsx
"use client";

import { motion } from "framer-motion";
import { Users, Target, Clock, Trash2 } from "lucide-react";
import { useDeleteChallenge, useJoinChallenge } from "@/hooks/useCommunity";
import type { ChallengeSummary } from "@/types/community";

const METRIC_LABELS: Record<string, string> = {
  ACTIVE_DAYS: "dias ativos",
  MEAL_COMPLETIONS: "refeições concluídas",
  STREAK_DAYS: "dias de streak",
};

export type ChallengeData = ChallengeSummary & { canDelete?: boolean };

export default function ChallengeCard({
  challenge,
  scope,
  groupId,
}: {
  challenge: ChallengeData;
  scope: "global" | "group";
  groupId?: string;
}) {
  const joinChallenge = useJoinChallenge(scope, groupId);
  const deleteChallenge = useDeleteChallenge(scope, groupId);

  const daysLeft = Math.max(0, Math.ceil((new Date(challenge.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const progress = challenge.myProgress ?? 0;
  const progressPct = Math.min(100, Math.round((progress / challenge.target) * 100));
  const isCompleted = !!challenge.myCompletedAt;
  const ended = new Date(challenge.endsAt).getTime() < Date.now();

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="bg-gradient-to-br from-[#007BFF] to-[#0056b3] rounded-2xl p-4 text-white flex flex-col"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Target size={20} className="flex-shrink-0" />
          <span className="font-semibold truncate">{challenge.title}</span>
        </div>
        {challenge.canDelete && (
          <button
            onClick={() => confirm("Excluir este desafio?") && deleteChallenge.mutate(challenge.id)}
            className="text-white/70 hover:text-white flex-shrink-0"
            title="Excluir desafio"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {challenge.description && <p className="text-sm text-white/80 mb-3">{challenge.description}</p>}

      <div className="flex items-center gap-4 mb-4 text-sm text-white/80">
        <span className="flex items-center gap-1">
          <Users size={14} />
          {METRIC_LABELS[challenge.metric] ?? challenge.metric}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={14} />
          {ended ? "encerrado" : `${daysLeft} dias restantes`}
        </span>
      </div>

      {challenge.joined ? (
        <>
          <div className="bg-white/20 rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6 }}
              className="h-full bg-white rounded-full"
            />
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span className="text-white/80">
              {progress}/{challenge.target}
            </span>
            <span className="font-semibold">{isCompleted ? "Concluído! 🎉" : `${progressPct}%`}</span>
          </div>
        </>
      ) : (
        <button
          onClick={() => joinChallenge.mutate(challenge.id)}
          disabled={joinChallenge.isPending || ended}
          className="mt-1 bg-white text-[#007BFF] rounded-full py-2 text-sm font-semibold disabled:opacity-50"
        >
          {ended ? "Desafio encerrado" : "Participar"}
        </button>
      )}

      {challenge.rewardXp > 0 && (
        <div className="mt-4 pt-3 border-t border-white/20 flex justify-between items-center">
          <span className="text-sm text-white/80">🏆 Recompensa:</span>
          <span className="font-bold">{challenge.rewardXp} XP</span>
        </div>
      )}
    </motion.div>
  );
}
