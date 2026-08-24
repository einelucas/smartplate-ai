// components/social/ActivityPickerModal.tsx
// Seletor de atividade (já registrada, ainda não compartilhada) pro
// attachment ACTIVITY do PostComposer. NÃO publica nada — só devolve o
// activityId pro Composer via onSelect.
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CalendarX } from "lucide-react";
import { resolveIcon } from "@/components/icon-registry";
import { ACTIVITY_TYPE_ICON_KEY, findActivityTypeLabel } from "@/lib/activity/options";
import { useActivities } from "@/hooks/useActivities";
import type { PostAttachment } from "@/lib/community/post-draft";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ActivityPickerModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (attachment: Extract<PostAttachment, { type: "ACTIVITY" }>) => void;
}) {
  const { data: activities, isLoading } = useActivities();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const shareable = (activities ?? []).filter((a) => !a.sharedPost);
  const selected = shareable.find((a) => a.id === selectedId) ?? null;

  const handleAdd = () => {
    if (!selected) return;
    const label = selected.activityType === "OTHER" && selected.customActivityName ? selected.customActivityName : findActivityTypeLabel(selected.activityType);
    onSelect({ type: "ACTIVITY", activityId: selected.id, preview: { label, durationMin: selected.durationMin } });
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
            <h3 className="font-semibold text-slate-800">Anexar atividade</h3>
            <button onClick={onClose} aria-label="Fechar" className="p-2 text-slate-400 hover:text-slate-700 rounded-lg">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 space-y-2">
            {isLoading && <p className="text-sm text-slate-400">Carregando...</p>}
            {!isLoading && shareable.length === 0 && (
              <div className="text-center py-8">
                <CalendarX className="mx-auto text-slate-300 mb-2" size={24} />
                <p className="text-sm text-slate-500">Nenhuma atividade disponível para compartilhar.</p>
                <p className="text-xs text-slate-400 mt-1">Registre uma atividade no SmartPlate primeiro.</p>
              </div>
            )}
            {shareable.map((activity) => {
              const Icon = resolveIcon(ACTIVITY_TYPE_ICON_KEY[activity.activityType]);
              const label = activity.activityType === "OTHER" && activity.customActivityName ? activity.customActivityName : findActivityTypeLabel(activity.activityType);
              return (
                <label
                  key={activity.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer ${
                    selectedId === activity.id ? "border-[#007BFF] bg-[#007BFF]/5" : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="activity"
                    checked={selectedId === activity.id}
                    onChange={() => setSelectedId(activity.id)}
                    className="accent-[#007BFF] flex-shrink-0"
                  />
                  <Icon size={18} weight="duotone" className="text-[#007BFF] flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {label} · {activity.durationMin} min
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(activity.performedAt)}</p>
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
