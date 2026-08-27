// components/achievements/AchievementUnlockModal.tsx
// Modal de "nova conquista desbloqueada" — sempre montado por
// AchievementUnlockProvider quando a fila não está vazia. Estratégia híbrida
// (checklist seção 23):
//   1-3 conquistas -> uma de cada vez ("Continuar" avança pra próxima)
//   4+ conquistas  -> resumo único ("N conquistas desbloqueadas!")
// Nunca mais de um modal na tela ao mesmo tempo.
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { getAchievementDisplay } from "@/lib/community/achievements";
import { ACHIEVEMENT_CATALOG, ACHIEVEMENT_RARITY_XP, getAchievementRarity, type AchievementRarity } from "@/lib/community/achievement-catalog";
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

const SUMMARY_THRESHOLD = 4;

interface ResolvedAchievement {
  code: string;
  title: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  xp: number;
}

function resolveAchievement(code: string): ResolvedAchievement | null {
  const display = getAchievementDisplay(code);
  if (!display) return null;
  const catalogEntry = ACHIEVEMENT_CATALOG[code];
  const rarity = getAchievementRarity(catalogEntry ?? {});
  return { code, title: display.title, description: display.description, icon: display.icon, rarity, xp: ACHIEVEMENT_RARITY_XP[rarity] };
}

/** Foca o primeiro elemento e prende Tab/Shift+Tab dentro do modal enquanto ele existir. */
function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, onEscape: () => void) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(
        (el) => !el.hasAttribute("disabled")
      );

    focusables()[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef.current]);
}

function Overlay({ children, onOverlayClick }: { children: React.ReactNode; onOverlayClick: () => void }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : undefined}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={onOverlayClick}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function SingleAchievementCard({ achievement, onSeeAchievement, onContinue }: { achievement: ResolvedAchievement; onSeeAchievement: () => void; onContinue: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const Icon = resolveIcon(achievement.icon);
  const titleId = "achievement-unlock-title";

  useFocusTrap(containerRef, onContinue);

  return (
    <motion.div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      initial={{ scale: 0.95, y: 20, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.95, y: 20, opacity: 0 }}
      transition={prefersReducedMotion ? { duration: 0.12 } : undefined}
      onClick={(e) => e.stopPropagation()}
      className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl"
    >
      <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 px-6 pt-8 pb-6 text-center border-b border-amber-100">
        <button type="button" onClick={onContinue} aria-label="Fechar" className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/60 text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
        <div className="mx-auto mb-3 flex items-center justify-center gap-1 text-amber-600">
          <Sparkles size={16} />
          <span className="text-xs font-semibold uppercase tracking-wide">Conquista desbloqueada!</span>
        </div>
        <Icon size={56} weight="duotone" className="mx-auto text-amber-500" aria-hidden="true" />
        <h2 id={titleId} className="mt-3 text-lg font-bold text-slate-800">
          {achievement.title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{achievement.description}</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${RARITY_STYLES[achievement.rarity]}`}>
            {RARITY_LABELS[achievement.rarity]}
          </span>
          <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full text-[#28A745] bg-[#28A745]/10">+{achievement.xp} XP</span>
        </div>
      </div>
      <div className="p-4 flex gap-2">
        <button type="button" onClick={onSeeAchievement} className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Ver conquista
        </button>
        <button type="button" onClick={onContinue} className="flex-1 py-2.5 rounded-xl bg-[#007BFF] text-sm font-semibold text-white hover:bg-[#0056b3]">
          Continuar
        </button>
      </div>
    </motion.div>
  );
}

function SummaryCard({ achievements, onSeeAll, onContinue }: { achievements: ResolvedAchievement[]; onSeeAll: () => void; onContinue: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const titleId = "achievement-unlock-summary-title";
  const totalXp = achievements.reduce((sum, a) => sum + a.xp, 0);

  useFocusTrap(containerRef, onContinue);

  return (
    <motion.div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      initial={{ scale: 0.95, y: 20, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.95, y: 20, opacity: 0 }}
      transition={prefersReducedMotion ? { duration: 0.12 } : undefined}
      onClick={(e) => e.stopPropagation()}
      className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl flex flex-col max-h-[85vh]"
    >
      <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 px-6 pt-6 pb-4 text-center border-b border-amber-100 flex-shrink-0">
        <button type="button" onClick={onContinue} aria-label="Fechar" className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/60 text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
        <Sparkles size={32} className="mx-auto text-amber-500" aria-hidden="true" />
        <h2 id={titleId} className="mt-2 text-lg font-bold text-slate-800">
          {achievements.length} conquistas desbloqueadas!
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">+{totalXp} XP no total</p>
      </div>
      <div className="p-3 overflow-y-auto space-y-1.5">
        {achievements.map((achievement) => {
          const Icon = resolveIcon(achievement.icon);
          return (
            <div key={achievement.code} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50">
              <Icon size={24} weight="duotone" className="text-amber-500 flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{achievement.title}</p>
                <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${RARITY_STYLES[achievement.rarity]}`}>
                  {RARITY_LABELS[achievement.rarity]}
                </span>
              </div>
              <span className="text-xs font-semibold text-[#28A745] flex-shrink-0">+{achievement.xp}</span>
            </div>
          );
        })}
      </div>
      <div className="p-4 flex gap-2 border-t border-slate-100 flex-shrink-0">
        <button type="button" onClick={onSeeAll} className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Ver conquistas
        </button>
        <button type="button" onClick={onContinue} className="flex-1 py-2.5 rounded-xl bg-[#007BFF] text-sm font-semibold text-white hover:bg-[#0056b3]">
          Continuar
        </button>
      </div>
    </motion.div>
  );
}

export default function AchievementUnlockModal({
  queue,
  onDismissOne,
  onDismissAll,
}: {
  queue: string[];
  onDismissOne: (code: string) => void;
  onDismissAll: () => void;
}) {
  const router = useRouter();

  const resolved = useMemo(() => queue.map(resolveAchievement).filter((a): a is ResolvedAchievement => a !== null), [queue]);

  if (resolved.length === 0) {
    // Códigos que não resolveram em nenhum catálogo (não deveria acontecer) —
    // nunca trava a fila esperando um item que nunca vai renderizar.
    if (queue.length > 0) onDismissAll();
    return null;
  }

  if (resolved.length >= SUMMARY_THRESHOLD) {
    return (
      <Overlay onOverlayClick={onDismissAll}>
        <SummaryCard
          achievements={resolved}
          onSeeAll={() => {
            onDismissAll();
            router.push("/profile?achievements=1");
          }}
          onContinue={onDismissAll}
        />
      </Overlay>
    );
  }

  const current = resolved[0];
  return (
    <Overlay onOverlayClick={() => onDismissOne(current.code)}>
      <SingleAchievementCard
        achievement={current}
        onSeeAchievement={() => {
          onDismissAll();
          router.push(`/profile?achievement=${encodeURIComponent(current.code)}`);
        }}
        onContinue={() => onDismissOne(current.code)}
      />
    </Overlay>
  );
}
