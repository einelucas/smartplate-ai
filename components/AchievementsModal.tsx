// components/AchievementsModal.tsx
// "Todas as conquistas" — grade completa com filtros (status + categoria),
// estados bloqueada/desbloqueada/em breve e detalhe ao clicar num card.
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, CheckCircle2, ChevronLeft, Clock } from "lucide-react";
import { useAchievements, type Achievement, type AchievementStatus } from "@/hooks/useAchievements";
import { ACHIEVEMENT_CATEGORY_LABELS, type AchievementCategory, type AchievementRarity } from "@/lib/community/achievement-catalog";
import { resolveIcon } from "@/components/icon-registry";

const RARITY_LABELS: Record<AchievementRarity, string> = {
  COMMON: "Comum",
  UNCOMMON: "Incomum",
  RARE: "Rara",
  EPIC: "Épica",
  SPECIAL: "Especial",
};

const RARITY_STYLES: Record<AchievementRarity, string> = {
  COMMON: "text-slate-500 bg-slate-100",
  UNCOMMON: "text-emerald-600 bg-emerald-50",
  RARE: "text-[#007BFF] bg-[#007BFF]/10",
  EPIC: "text-purple-600 bg-purple-50",
  SPECIAL: "text-amber-600 bg-amber-100",
};

function RarityBadge({ rarity }: { rarity?: AchievementRarity }) {
  const value = rarity ?? "COMMON";
  return <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${RARITY_STYLES[value]}`}>{RARITY_LABELS[value]}</span>;
}

type StatusFilter = "ALL" | "UNLOCKED" | "LOCKED";
type CategoryFilter = "ALL" | AchievementCategory;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "UNLOCKED", label: "Desbloqueadas" },
  { value: "LOCKED", label: "Bloqueadas" },
];

const CATEGORY_ORDER: AchievementCategory[] = [
  "ONBOARDING",
  "FOOD",
  "HYDRATION",
  "STREAK",
  "PROGRESS",
  "ACTIVITY",
  "SOCIAL",
  "CHALLENGE",
  "SPECIAL",
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function statusRank(a: Achievement): number {
  if (a.status === "UNLOCKED") return 0;
  if (a.status === "LOCKED" && (a.progress ?? 0) > 0) return 1;
  if (a.status === "LOCKED") return 2;
  return 3;
}

function sortAchievements(list: Achievement[]): Achievement[] {
  return [...list].sort((a, b) => {
    const rankDiff = statusRank(a) - statusRank(b);
    if (rankDiff !== 0) return rankDiff;
    if (a.status === "UNLOCKED" && b.status === "UNLOCKED") {
      return new Date(b.unlockedAt ?? 0).getTime() - new Date(a.unlockedAt ?? 0).getTime();
    }
    if (a.status === "LOCKED" && b.status === "LOCKED") {
      const ratioA = (a.progress ?? 0) / a.target;
      const ratioB = (b.progress ?? 0) / b.target;
      return ratioB - ratioA;
    }
    return a.title.localeCompare(b.title, "pt-BR");
  });
}

function StatusBadge({ status }: { status: AchievementStatus }) {
  if (status === "UNLOCKED") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#28A745] bg-[#28A745]/10 px-2 py-0.5 rounded-full">
        <CheckCircle2 size={12} /> Desbloqueada
      </span>
    );
  }
  if (status === "COMING_SOON") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
        <Clock size={12} /> Em breve
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
      <Lock size={12} /> Bloqueada
    </span>
  );
}

function AchievementCard({ achievement, onClick }: { achievement: Achievement; onClick: () => void }) {
  const isUnlocked = achievement.status === "UNLOCKED";
  const isComingSoon = achievement.status === "COMING_SOON";
  const showProgress = !isComingSoon && achievement.target > 1 && achievement.progress !== null;
  const AchievementIcon = resolveIcon(achievement.icon);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${achievement.title} — ${isUnlocked ? "desbloqueada" : isComingSoon ? "em breve" : "bloqueada"}`}
      className={`text-left p-4 rounded-2xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-[#007BFF] flex flex-col gap-2 ${
        isUnlocked
          ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 hover:shadow-md"
          : isComingSoon
            ? "bg-slate-50 border-slate-200 border-dashed opacity-75 hover:opacity-90"
            : "bg-slate-50 border-slate-200 opacity-60 saturate-[0.6] hover:opacity-80"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {isUnlocked ? (
          <AchievementIcon size={30} weight="duotone" className="text-amber-500" aria-hidden="true" />
        ) : (
          <Lock size={22} className="text-slate-400" aria-hidden="true" />
        )}
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={achievement.status} />
          <RarityBadge rarity={achievement.rarity} />
        </div>
      </div>
      <h4 className="font-semibold text-slate-800 text-sm leading-tight">{achievement.title}</h4>
      <p className="text-xs text-slate-500 leading-snug line-clamp-2">{achievement.description}</p>

      {showProgress && (
        <div className="mt-1">
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#007BFF] to-[#28A745] rounded-full"
              style={{ width: `${Math.min(100, ((achievement.progress ?? 0) / achievement.target) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {achievement.progress} / {achievement.target}
          </p>
        </div>
      )}

      {isUnlocked && achievement.unlockedAt && <p className="text-[11px] text-slate-400">{formatDate(achievement.unlockedAt)}</p>}
    </button>
  );
}

function AchievementDetail({ achievement, onBack }: { achievement: Achievement; onBack: () => void }) {
  const isUnlocked = achievement.status === "UNLOCKED";
  const isComingSoon = achievement.status === "COMING_SOON";
  const showProgress = !isComingSoon && !isUnlocked && achievement.target > 1 && achievement.progress !== null;
  const AchievementIcon = resolveIcon(achievement.icon);

  return (
    <div className="p-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-5"
      >
        <ChevronLeft size={16} /> Voltar
      </button>

      <div className="flex flex-col items-center text-center gap-3">
        {isUnlocked ? (
          <AchievementIcon size={48} weight="duotone" className="text-amber-500" aria-hidden="true" />
        ) : (
          <Lock size={40} className="text-slate-300" aria-hidden="true" />
        )}
        <h3 className="text-xl font-bold text-slate-800">{achievement.title}</h3>
        <p className="text-sm text-slate-500 max-w-sm">{achievement.description}</p>
        <div className="flex items-center gap-2">
          <StatusBadge status={achievement.status} />
          <RarityBadge rarity={achievement.rarity} />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {isUnlocked && achievement.unlockedAt ? (
          <div className="bg-[#28A745]/10 rounded-xl p-4 text-center">
            <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-[#28A745]">
              <CheckCircle2 size={16} /> Desbloqueada
            </p>
            <p className="text-xs text-slate-500 mt-1">{formatDate(achievement.unlockedAt)}</p>
          </div>
        ) : isComingSoon ? (
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 mb-1">
              <Clock size={16} /> Em breve
            </p>
            <p className="text-xs text-slate-500">{achievement.comingSoonReason ?? "Disponível em uma próxima atualização."}</p>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-slate-600 mb-1">Como desbloquear</p>
            <p className="text-xs text-slate-500">{achievement.unlockDescription}</p>
            {showProgress && (
              <div className="mt-3">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#007BFF] to-[#28A745] rounded-full"
                    style={{ width: `${Math.min(100, ((achievement.progress ?? 0) / achievement.target) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  Seu progresso: {achievement.progress} / {achievement.target}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AchievementsModal({ onClose, initialCode }: { onClose: () => void; initialCode?: string | null }) {
  const { data, isLoading, isError } = useAchievements();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [detail, setDetail] = useState<Achievement | null>(null);

  // Deep link vindo de "Ver conquista" no modal de desbloqueio (?achievement=CODE)
  // — abre direto no detalhe da conquista recém-desbloqueada.
  useEffect(() => {
    if (!initialCode || detail || !data) return;
    const match = data.achievements.find((a) => a.code === initialCode);
    if (match) setDetail(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode, data]);

  const filtered = useMemo(() => {
    let list = data?.achievements ?? [];
    if (statusFilter === "UNLOCKED") list = list.filter((a) => a.status === "UNLOCKED");
    else if (statusFilter === "LOCKED") list = list.filter((a) => a.status === "LOCKED" || a.status === "COMING_SOON");
    if (categoryFilter !== "ALL") list = list.filter((a) => a.category === categoryFilter);
    return sortAchievements(list);
  }, [data?.achievements, statusFilter, categoryFilter]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {detail ? (
            <div className="overflow-y-auto">
              <AchievementDetail achievement={detail} onBack={() => setDetail(null)} />
            </div>
          ) : (
            <>
              <div className="p-5 border-b border-slate-100 flex justify-between items-start flex-shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Todas as conquistas</h2>
                  {data && (
                    <p className="text-xs text-slate-500 mt-1">
                      {data.summary.unlocked} / {data.summary.total} desbloqueadas · {data.summary.percentage}% concluído
                    </p>
                  )}
                </div>
                <button type="button" onClick={onClose} aria-label="Fechar" title="Fechar" className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              <div className="px-5 pt-3 flex-shrink-0 space-y-2">
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setStatusFilter(f.value)}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-colors flex-shrink-0 ${
                        statusFilter === f.value ? "border-[#007BFF] bg-[#007BFF]/10 text-[#007BFF]" : "border-slate-200 text-slate-600 bg-white"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter("ALL")}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-colors flex-shrink-0 ${
                      categoryFilter === "ALL" ? "border-[#28A745] bg-[#28A745]/10 text-[#28A745]" : "border-slate-200 text-slate-600 bg-white"
                    }`}
                  >
                    Todas categorias
                  </button>
                  {CATEGORY_ORDER.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-colors flex-shrink-0 ${
                        categoryFilter === cat ? "border-[#28A745] bg-[#28A745]/10 text-[#28A745]" : "border-slate-200 text-slate-600 bg-white"
                      }`}
                    >
                      {ACHIEVEMENT_CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5 overflow-y-auto flex-1">
                {isLoading && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
                    ))}
                  </div>
                )}
                {isError && !isLoading && <p className="text-sm text-slate-400 text-center py-10">Não foi possível carregar suas conquistas.</p>}
                {!isLoading && !isError && filtered.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-10">Nenhuma conquista nesse filtro.</p>
                )}
                {!isLoading && !isError && filtered.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((achievement) => (
                      <AchievementCard key={achievement.code} achievement={achievement} onClick={() => setDetail(achievement)} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
