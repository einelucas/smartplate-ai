// components/social/AchievementPickerModal.tsx
// Seletor de conquista já desbloqueada pro attachment ACHIEVEMENT do
// PostComposer. NÃO publica nada — só devolve o achievementCode pro
// Composer via onSelect. O servidor sempre reverifica que a conquista está
// mesmo desbloqueada antes de criar o post.
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy } from "lucide-react";
import { resolveIcon } from "@/components/icon-registry";
import { useAchievements } from "@/hooks/useAchievements";
import type { PostAttachment } from "@/lib/community/post-draft";

export default function AchievementPickerModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (attachment: Extract<PostAttachment, { type: "ACHIEVEMENT" }>) => void;
}) {
  const { data, isLoading } = useAchievements();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const unlocked = (data?.achievements ?? []).filter((a) => a.status === "UNLOCKED");
  const selected = unlocked.find((a) => a.code === selectedCode) ?? null;

  const handleAdd = () => {
    if (!selected) return;
    onSelect({ type: "ACHIEVEMENT", achievementCode: selected.code, preview: { title: selected.title, icon: selected.icon } });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col"
        >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <h3 className="font-semibold text-slate-800">Anexar conquista</h3>
            <button onClick={onClose} aria-label="Fechar" className="p-2 text-slate-400 hover:text-slate-700 rounded-lg">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 space-y-2">
            {isLoading && <p className="text-sm text-slate-400">Carregando...</p>}
            {!isLoading && unlocked.length === 0 && (
              <div className="text-center py-8">
                <Trophy className="mx-auto text-slate-300 mb-2" size={24} />
                <p className="text-sm text-slate-500">Você ainda não desbloqueou nenhuma conquista.</p>
              </div>
            )}
            {unlocked.map((achievement) => {
              const Icon = resolveIcon(achievement.icon);
              return (
                <label
                  key={achievement.code}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer ${
                    selectedCode === achievement.code ? "border-[#007BFF] bg-[#007BFF]/5" : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="achievement"
                    checked={selectedCode === achievement.code}
                    onChange={() => setSelectedCode(achievement.code)}
                    className="accent-[#007BFF] flex-shrink-0"
                  />
                  <Icon size={18} weight="duotone" className="text-amber-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{achievement.title}</p>
                    <p className="text-xs text-slate-400 truncate">{achievement.description}</p>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="p-4 border-t border-slate-100 flex-shrink-0">
            <button
              onClick={handleAdd}
              disabled={!selected}
              className="w-full bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              Adicionar ao post
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
