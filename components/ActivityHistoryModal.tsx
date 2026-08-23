// components/ActivityHistoryModal.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Pencil, Check, Share2, CalendarX } from "lucide-react";
import { findActivityIntensityLabel, findActivityTypeLabel, ACTIVITY_TYPE_ICON_KEY } from "@/lib/activity/options";
import { resolveIcon } from "@/components/icon-registry";
import { useActivities, useDeleteActivity, useUpdateActivity, type ActivityLogEntry } from "@/hooks/useActivities";
import { useCreatePost, useMyGroups } from "@/hooks/useCommunity";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function activityDisplayName(activity: ActivityLogEntry): string {
  if (activity.activityType === "OTHER" && activity.customActivityName) return activity.customActivityName;
  return findActivityTypeLabel(activity.activityType);
}

function ShareRow({ activity, onDone }: { activity: ActivityLogEntry; onDone: () => void }) {
  const createPost = useCreatePost();
  const { data: myGroups } = useMyGroups();
  const groups = myGroups?.groups ?? [];
  const [destination, setDestination] = useState<"GENERAL" | "GROUP">("GENERAL");
  const [groupId, setGroupId] = useState("");

  const handleConfirm = () => {
    if (destination === "GROUP" && !groupId) return;
    createPost.mutate(
      { type: "ACTIVITY", activityLogId: activity.id, groupId: destination === "GROUP" ? groupId : undefined },
      { onSuccess: onDone }
    );
  };

  return (
    <div className="mt-2 p-3 bg-slate-50 rounded-xl space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setDestination("GENERAL")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border-2 ${destination === "GENERAL" ? "border-[#007BFF] bg-[#007BFF]/10 text-[#007BFF]" : "border-slate-200 text-slate-500"}`}
        >
          Comunidade geral
        </button>
        {groups.length > 0 && (
          <button
            type="button"
            onClick={() => setDestination("GROUP")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border-2 ${destination === "GROUP" ? "border-[#007BFF] bg-[#007BFF]/10 text-[#007BFF]" : "border-slate-200 text-slate-500"}`}
          >
            Grupo específico
          </button>
        )}
      </div>
      {destination === "GROUP" && (
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
        >
          <option value="">Selecione um grupo</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="flex-1 py-1.5 text-xs text-slate-500 font-medium">
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={createPost.isPending || (destination === "GROUP" && !groupId)}
          className="flex-1 py-1.5 bg-[#007BFF] text-white rounded-lg text-xs font-semibold disabled:opacity-50"
        >
          Publicar
        </button>
      </div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: ActivityLogEntry }) {
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [durationMin, setDurationMin] = useState(String(activity.durationMin));
  const [notes, setNotes] = useState(activity.notes ?? "");

  const Icon = resolveIcon(ACTIVITY_TYPE_ICON_KEY[activity.activityType]);

  const handleSave = () => {
    const duration = Number(durationMin);
    if (!durationMin.trim() || Number.isNaN(duration) || duration <= 0) return;
    updateActivity.mutate(
      { id: activity.id, durationMin: duration, notes: notes.trim() || null },
      { onSuccess: () => setEditing(false) }
    );
  };

  const handleDelete = () => {
    if (!confirm("Excluir esta atividade? Essa ação não pode ser desfeita.")) return;
    deleteActivity.mutate(activity.id);
  };

  return (
    <div className="p-3 rounded-xl hover:bg-slate-50">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#007BFF]/10 flex items-center justify-center flex-shrink-0">
          <Icon size={20} weight="duotone" className="text-[#007BFF]" />
        </div>

        {editing ? (
          <div className="flex-1 min-w-0 space-y-1.5">
            <input
              type="number"
              inputMode="numeric"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              placeholder="Duração (min)"
              className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs"
            />
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 300))}
              placeholder="Observação"
              className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700">
              {activityDisplayName(activity)} <span className="text-slate-400 font-normal">• {formatDate(activity.performedAt)}</span>
            </p>
            <p className="text-xs text-slate-400 truncate">
              {activity.durationMin} min
              {activity.distanceKm ? ` • ${activity.distanceKm} km` : ""}
              {activity.intensity ? ` • ${findActivityIntensityLabel(activity.intensity)}` : ""}
              {activity.notes ? ` • ${activity.notes}` : ""}
            </p>
          </div>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {editing ? (
            <button onClick={handleSave} title="Salvar" aria-label="Salvar" className="p-2 text-[#28A745] hover:bg-[#28A745]/10 rounded-lg">
              <Check size={14} />
            </button>
          ) : (
            <>
              {!activity.sharedPost && (
                <button
                  onClick={() => setSharing((v) => !v)}
                  title="Compartilhar"
                  aria-label="Compartilhar atividade"
                  className="p-2 text-slate-400 hover:text-[#007BFF] hover:bg-[#007BFF]/10 rounded-lg"
                >
                  <Share2 size={14} />
                </button>
              )}
              <button onClick={() => setEditing(true)} title="Editar" aria-label="Editar atividade" className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
                <Pencil size={14} />
              </button>
              <button onClick={handleDelete} title="Excluir" aria-label="Excluir atividade" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {sharing && !editing && <ShareRow activity={activity} onDone={() => setSharing(false)} />}
    </div>
  );
}

export default function ActivityHistoryModal({ onClose }: { onClose: () => void }) {
  const { data: activities, isLoading, isError } = useActivities();
  const list = activities ?? [];

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
          className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col"
        >
          <div className="p-5 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
            <h2 className="text-lg font-bold text-slate-800">Histórico de atividades</h2>
            <button type="button" onClick={onClose} aria-label="Fechar" title="Fechar" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={18} className="text-slate-400" />
            </button>
          </div>

          <div className="p-3 overflow-y-auto flex-1">
            {isLoading && <p className="text-sm text-slate-400 p-3">Carregando...</p>}
            {isError && !isLoading && <p className="text-sm text-slate-400 text-center py-8">Não foi possível carregar seu histórico.</p>}
            {!isLoading && !isError && list.length === 0 && (
              <div className="text-center py-10">
                <CalendarX className="mx-auto text-slate-300 mb-2" size={28} />
                <p className="text-sm text-slate-500">Nenhuma atividade registrada ainda.</p>
              </div>
            )}
            {list.map((activity) => (
              <ActivityRow key={activity.id} activity={activity} />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
