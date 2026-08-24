// components/social/AchievementCelebration.tsx
// Celebrações locais (toast) de conquista/streak. NUNCA publica automaticamente
// na Comunidade — só cria o post se o usuário clicar em "Compartilhar".
"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { FireIcon } from "@phosphor-icons/react";
import { useCreatePost } from "@/hooks/useCommunity";
import { openPostComposer } from "./PostComposerProvider";
import { ACHIEVEMENTS, type AchievementCode } from "@/lib/community/achievements";
import { resolveIcon } from "@/components/icon-registry";

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

function AchievementToastContent({ code, toastId }: { code: string; toastId: string }) {
  const def = (ACHIEVEMENTS as Record<string, { title: string; description: string; icon: string }>)[code];

  if (!def) return null;

  const Icon = resolveIcon(def.icon);

  return (
    <div className="flex items-center gap-3 bg-white shadow-lg rounded-2xl p-4 border border-amber-100 max-w-sm">
      <Icon size={26} weight="duotone" className="text-amber-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800">Nova conquista</p>
        <p className="text-xs text-slate-500 truncate">{def.title}</p>
      </div>
      <button
        onClick={() => {
          toast.dismiss(toastId);
          openPostComposer({
            attachment: { type: "ACHIEVEMENT", achievementCode: code as AchievementCode, preview: { title: def.title, icon: def.icon } },
          });
        }}
        className="text-xs font-semibold text-[#007BFF] flex-shrink-0"
      >
        Compartilhar
      </button>
      <button onClick={() => toast.dismiss(toastId)} className="text-slate-300 hover:text-slate-500 flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

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

export function celebrateAchievements(codes: string[] | undefined) {
  if (!codes || codes.length === 0) return;
  for (const code of codes) {
    toast.custom((t) => <AchievementToastContent code={code} toastId={t.id} />, { duration: 8000 });
  }
}

export function celebrateStreakIfMilestone(currentStreak: number | undefined) {
  if (!currentStreak || !STREAK_MILESTONES.includes(currentStreak)) return;
  toast.custom((t) => <StreakToastContent milestone={currentStreak} toastId={t.id} />, { duration: 8000 });
}
