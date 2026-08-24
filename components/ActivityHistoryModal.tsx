// components/ActivityHistoryModal.tsx
// Histórico de atividades — visualmente unificado (SmartPlate + providers
// externos privados), mas as fontes continuam separadas internamente
// (ActivityLog nunca vira Strava, Strava nunca vira ActivityLog). Ver
// hooks/useActivityHistory.ts para o DTO de apresentação.
"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Pencil, Check, Share2, CalendarX } from "lucide-react";
import { findActivityIntensityLabel, ACTIVITY_TYPE_ICON_KEY, findActivityTypeLabel } from "@/lib/activity/options";
import { resolveIcon } from "@/components/icon-registry";
import { useDeleteActivity, useUpdateActivity, type ActivityLogEntry } from "@/hooks/useActivities";
import { useOpenPostComposer } from "@/components/social/PostComposerProvider";
import { useConnectedApps } from "@/hooks/useConnectedApps";
import { useActivityHistory, type ActivityHistoryItem } from "@/hooks/useActivityHistory";
import { getProviderDisplay } from "@/lib/integrations/provider-display";
import ActivitySourceBadge from "@/components/ActivitySourceBadge";

const ExternalActivityDetailModal = dynamic(() => import("./ExternalActivityDetailModal"), { ssr: false });

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function ActivityRow({ item }: { item: ActivityHistoryItem }) {
  const activity = item.raw as ActivityLogEntry;
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();
  const openComposer = useOpenPostComposer();
  const [editing, setEditing] = useState(false);
  const [durationMin, setDurationMin] = useState(String(activity.durationMin));
  const [notes, setNotes] = useState(activity.notes ?? "");

  const Icon = resolveIcon(ACTIVITY_TYPE_ICON_KEY[activity.activityType]);

  const handleShare = () => {
    const label =
      activity.activityType === "OTHER" && activity.customActivityName
        ? activity.customActivityName
        : findActivityTypeLabel(activity.activityType);
    openComposer({ attachment: { type: "ACTIVITY", activityId: activity.id, preview: { label, durationMin: activity.durationMin } } });
  };

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
              {item.title} <span className="text-slate-400 font-normal">• {formatDate(item.performedAt)}</span>
            </p>
            <p className="text-xs text-slate-400 truncate">
              {activity.durationMin} min
              {activity.distanceKm ? ` • ${activity.distanceKm} km` : ""}
              {activity.intensity ? ` • ${findActivityIntensityLabel(activity.intensity)}` : ""}
              {activity.notes ? ` • ${activity.notes}` : ""}
            </p>
            <div className="mt-1">
              <ActivitySourceBadge source="MANUAL" />
            </div>
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
                  onClick={handleShare}
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
    </div>
  );
}

function ExternalActivityRow({ item, onOpen }: { item: ActivityHistoryItem; onOpen: () => void }) {
  const display = getProviderDisplay(item.source);
  const Icon = resolveIcon(ACTIVITY_TYPE_ICON_KEY[item.activityType] ?? display.icon);

  return (
    <button type="button" onClick={onOpen} className="w-full text-left p-3 rounded-xl hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Icon size={20} weight="duotone" className={display.accentClassName} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 truncate">
            {item.title} <span className="text-slate-400 font-normal">• {formatDate(item.performedAt)}</span>
          </p>
          <p className="text-xs text-slate-400 truncate">
            {item.durationMin ? `${item.durationMin} min` : ""}
            {item.distanceKm ? ` • ${item.distanceKm} km` : ""}
          </p>
          <div className="mt-1">
            <ActivitySourceBadge source={item.source} showLock />
          </div>
        </div>
      </div>
    </button>
  );
}

type FilterKey = "ALL" | "MANUAL" | string;

export default function ActivityHistoryModal({
  onClose,
  initialFilter = "ALL",
}: {
  onClose: () => void;
  initialFilter?: FilterKey;
}) {
  const { manualItems, externalItems, allItems, isLoading, isError } = useActivityHistory();
  const { data: connectedApps } = useConnectedApps();
  const connectedProviders = useMemo(
    () => (connectedApps?.apps ?? []).filter((a) => a.status === "CONNECTED").map((a) => a.provider),
    [connectedApps]
  );

  const [filter, setFilter] = useState<FilterKey>(initialFilter);
  const [detailItem, setDetailItem] = useState<ActivityHistoryItem | null>(null);

  const tabs = useMemo(() => {
    const base: { key: FilterKey; label: string }[] = [
      { key: "ALL", label: "Todas" },
      { key: "MANUAL", label: "SmartPlate" },
    ];
    for (const provider of connectedProviders) {
      base.push({ key: provider, label: getProviderDisplay(provider).label });
    }
    return base;
  }, [connectedProviders]);

  const visibleItems =
    filter === "ALL" ? allItems : filter === "MANUAL" ? manualItems : externalItems.filter((item) => item.source === filter);

  const nothingAnywhere = manualItems.length === 0 && externalItems.length === 0;

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

          {tabs.length > 2 && (
            <div className="px-3 pt-3 flex-shrink-0">
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      filter === tab.key ? "bg-[#007BFF] text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 overflow-y-auto flex-1">
            {isLoading && <p className="text-sm text-slate-400 p-3">Carregando...</p>}
            {isError && !isLoading && <p className="text-sm text-slate-400 text-center py-8">Não foi possível carregar seu histórico.</p>}

            {!isLoading && !isError && (
              <>
                {nothingAnywhere ? (
                  <div className="text-center py-10">
                    <CalendarX className="mx-auto text-slate-300 mb-2" size={28} />
                    <p className="text-sm text-slate-500">Nenhuma atividade encontrada.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Registre uma atividade no SmartPlate ou conecte um aplicativo para acompanhar suas atividades.
                    </p>
                  </div>
                ) : visibleItems.length === 0 ? (
                  <div className="text-center py-10">
                    <CalendarX className="mx-auto text-slate-300 mb-2" size={28} />
                    <p className="text-sm text-slate-500">
                      {filter === "MANUAL"
                        ? "Nenhuma atividade registrada diretamente no SmartPlate ainda."
                        : `Nenhuma atividade sincronizada do ${getProviderDisplay(filter).label} ainda.`}
                    </p>
                  </div>
                ) : (
                  visibleItems.map((item) =>
                    item.isPrivateExternal ? (
                      <ExternalActivityRow key={`${item.source}-${item.id}`} item={item} onOpen={() => setDetailItem(item)} />
                    ) : (
                      <ActivityRow key={`${item.source}-${item.id}`} item={item} />
                    )
                  )
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>

      {detailItem && <ExternalActivityDetailModal item={detailItem} onClose={() => setDetailItem(null)} />}
    </AnimatePresence>
  );
}
