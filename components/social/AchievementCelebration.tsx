// components/social/AchievementCelebration.tsx
// Celebração local (toast) do marco de streak "X dias de consistência" — não
// é uma conquista/badge em si (isso é o AchievementUnlockModal, disparado via
// queueAchievementUnlocks em components/achievements/AchievementUnlockProvider.tsx),
// só um nudge de "você bateu um marco de sequência agora". NUNCA publica
// automaticamente na Comunidade — só cria o post se o usuário clicar em
// "Compartilhar".
//
// O toast antigo de "Nova conquista" (celebrateAchievements) que vivia aqui
// foi removido: virou redundante com o modal enriquecido — ambos reagiam ao
// mesmo newlyUnlocked, então o usuário via ou o toast ou o modal dependendo
// da origem do unlock, exatamente o problema que a fila unificada resolve.
"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { FireIcon } from "@phosphor-icons/react";
import { useCreatePost } from "@/hooks/useCommunity";

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

function StreakToastContent({ milestone, toastId }: { milestone: number; toastId: string }) {
  const createPost = useCreatePost();
  const [shared, setShared] = useState(false);

  return (
    <div className="flex items-center gap-3 bg-white shadow-lg rounded-2xl p-4 border border-orange-100 max-w-sm">
      <FireIcon size={26} weight="duotone" className="text-orange-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800">{milestone} dias de consistência!</p>
      </div>
      {!shared ? (
        <button
          onClick={() => {
            createPost.mutate({ type: "STREAK", streakMilestone: milestone });
            setShared(true);
          }}
          className="text-xs font-semibold text-[#007BFF] flex-shrink-0"
        >
          Compartilhar
        </button>
      ) : (
        <span className="text-xs text-[#28A745] flex-shrink-0">Compartilhado!</span>
      )}
      <button onClick={() => toast.dismiss(toastId)} className="text-slate-300 hover:text-slate-500 flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

export function celebrateStreakIfMilestone(currentStreak: number | undefined) {
  if (!currentStreak || !STREAK_MILESTONES.includes(currentStreak)) return;
  toast.custom((t) => <StreakToastContent milestone={currentStreak} toastId={t.id} />, { duration: 8000 });
}
