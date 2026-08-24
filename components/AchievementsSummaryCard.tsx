// components/AchievementsSummaryCard.tsx
// Visão resumida de Conquistas no Perfil — nunca renderiza as 50 aqui
// (ver AchievementsModal para a lista completa via "Ver todas as conquistas").
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { useAchievements, type Achievement } from "@/hooks/useAchievements";
import { resolveIcon } from "@/components/icon-registry";

// Modal só existe depois de um clique em "Ver todas" — tirado do bundle
// inicial do Perfil (314 linhas + toda a lógica de filtro/categoria).
const AchievementsModal = dynamic(() => import("./AchievementsModal"), { ssr: false });

function pickPreview(achievements: Achievement[]): Achievement[] {
  const unlocked = achievements
    .filter((a) => a.status === "UNLOCKED")
    .sort((a, b) => new Date(b.unlockedAt ?? 0).getTime() - new Date(a.unlockedAt ?? 0).getTime());

  const lockedWithProgress = achievements
    .filter((a) => a.status === "LOCKED" && (a.progress ?? 0) > 0)
    .sort((a, b) => (b.progress ?? 0) / b.target - (a.progress ?? 0) / a.target);

  const preview = [...unlocked, ...lockedWithProgress].slice(0, 6);
  if (preview.length < 6) {
    const rest = achievements.filter((a) => !preview.includes(a) && a.status !== "COMING_SOON");
    preview.push(...rest.slice(0, 6 - preview.length));
  }
  return preview;
}

export default function AchievementsSummaryCard() {
  const { data, isLoading, isError } = useAchievements();
  const [showAll, setShowAll] = useState(false);

  const unlocked = data?.summary.unlocked ?? 0;
  const total = data?.summary.total ?? 0;
  const percentage = data?.summary.percentage ?? 0;
  const preview = data ? pickPreview(data.achievements) : [];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-1">
        <h3 className="font-bold text-slate-800">Conquistas</h3>
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-[#007BFF] hover:text-[#0056b3] font-medium"
        >
          Ver todas as conquistas
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3 mt-4 animate-pulse">
          <div className="h-4 bg-slate-100 rounded w-1/3" />
          <div className="h-2 bg-slate-100 rounded-full w-full" />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-2xl" />
            ))}
          </div>
        </div>
      )}

      {isError && !isLoading && <p className="text-sm text-slate-400 text-center py-8">Não foi possível carregar suas conquistas.</p>}

      {!isLoading && !isError && data && (
        <>
          <p className="text-sm text-slate-500 mt-1">
            {unlocked} / {total} desbloqueadas · {percentage}% concluído
          </p>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2 mb-5">
            <div
              className="h-full bg-gradient-to-r from-[#007BFF] to-[#28A745] rounded-full transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {unlocked === 0 ? (
            <div className="text-center py-6">
              <Lock className="mx-auto text-slate-300 mb-2" size={28} />
              <p className="text-sm text-slate-500">Sua jornada está começando.</p>
              <p className="text-xs text-slate-400 mt-1">Complete ações no SmartPlate para desbloquear conquistas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {preview.map((ach) => {
                const isUnlocked = ach.status === "UNLOCKED";
                const AchIcon = resolveIcon(ach.icon);
                return (
                  <motion.div
                    key={ach.code}
                    whileHover={{ scale: 1.05 }}
                    title={ach.title}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 text-center ${
                      isUnlocked
                        ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200"
                        : "bg-slate-50 border-slate-200 opacity-60"
                    }`}
                  >
                    {isUnlocked ? (
                      <AchIcon size={24} weight="duotone" className="text-amber-500" />
                    ) : (
                      <Lock size={20} className="text-slate-400" />
                    )}
                    <span className="text-[11px] text-center font-medium leading-tight text-slate-700 line-clamp-2">{ach.title}</span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {showAll && <AchievementsModal onClose={() => setShowAll(false)} />}
    </div>
  );
}
