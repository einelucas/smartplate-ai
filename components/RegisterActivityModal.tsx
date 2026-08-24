// components/RegisterActivityModal.tsx
// Componente ÚNICO de registro de atividade — reutilizado em Início,
// Comunidade e Perfil (nunca duplicar este formulário). Compartilhamento é
// sempre opcional e explícito; o padrão é "Não compartilhar".
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { ACTIVITY_INTENSITIES, ACTIVITY_TYPES, ACTIVITY_TYPE_ICON_KEY, findActivityTypeLabel } from "@/lib/activity/options";
import { resolveIcon } from "@/components/icon-registry";
import { useCreateActivity } from "@/hooks/useActivities";
import { useMyGroups } from "@/hooks/useCommunity";
import { useOpenPostComposer } from "@/components/social/PostComposerProvider";

type ShareDestination = "NONE" | "GENERAL" | "GROUP";

function todayInputValue(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function nowTimeValue(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export default function RegisterActivityModal({
  isOpen,
  onClose,
  allowShare = true,
  defaultGroupId,
}: {
  isOpen: boolean;
  onClose: () => void;
  /** false esconde a seção de compartilhamento (ex.: se o fluxo já define o destino fora do modal). */
  allowShare?: boolean;
  /** Pré-seleciona "Grupo específico" com este grupo (ex.: acionado de dentro de um grupo). */
  defaultGroupId?: string;
}) {
  const createActivity = useCreateActivity();
  const openComposer = useOpenPostComposer();
  const { data: myGroups } = useMyGroups();

  const [activityType, setActivityType] = useState("WALKING");
  const [customActivityName, setCustomActivityName] = useState("");
  const [date, setDate] = useState(todayInputValue());
  const [time, setTime] = useState(nowTimeValue());
  const [durationMin, setDurationMin] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [intensity, setIntensity] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [shareTo, setShareTo] = useState<ShareDestination>("NONE");
  const [groupId, setGroupId] = useState(defaultGroupId ?? "");

  const isSaving = createActivity.isPending;

  const reset = () => {
    setActivityType("WALKING");
    setCustomActivityName("");
    setDate(todayInputValue());
    setTime(nowTimeValue());
    setDurationMin("");
    setDistanceKm("");
    setIntensity(null);
    setNotes("");
    setShareTo("NONE");
    setGroupId(defaultGroupId ?? "");
  };

  const handleClose = () => {
    if (isSaving) return; // evita fechar/perder o registro em andamento
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const duration = Number(durationMin);
    if (!durationMin.trim() || Number.isNaN(duration) || duration <= 0) return;
    if (activityType === "OTHER" && !customActivityName.trim()) return;
    if (shareTo === "GROUP" && !groupId) return;

    const distance = distanceKm.trim() ? Number(distanceKm) : undefined;
    if (distanceKm.trim() && (Number.isNaN(distance) || (distance as number) <= 0)) return;

    const performedAt = new Date(`${date}T${time || "12:00"}:00`).toISOString();

    createActivity.mutate(
      {
        activityType,
        customActivityName: activityType === "OTHER" ? customActivityName.trim() : undefined,
        durationMin: duration,
        distanceKm: distance,
        intensity: intensity ?? undefined,
        notes: notes.trim() || undefined,
        performedAt,
      },
      {
        onSuccess: (result) => {
          if (shareTo !== "NONE") {
            const label =
              activityType === "OTHER" && customActivityName.trim()
                ? customActivityName.trim()
                : findActivityTypeLabel(activityType);
            openComposer({
              attachment: { type: "ACTIVITY", activityId: result.activity.id, preview: { label, durationMin: duration } },
              groupId: shareTo === "GROUP" ? groupId : undefined,
            });
          }
          reset();
          onClose();
        },
      }
    );
  };

  const groups = myGroups?.groups ?? [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
          >
            <div className="p-5 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10 flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-800">Registrar atividade</h2>
              <button type="button" onClick={handleClose} aria-label="Fechar" title="Fechar" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
              <div className="p-5 space-y-5">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Tipo de atividade</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {ACTIVITY_TYPES.map((t) => {
                      const Icon = resolveIcon(ACTIVITY_TYPE_ICON_KEY[t.value]);
                      const selected = activityType === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setActivityType(t.value)}
                          className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-center transition-colors ${
                            selected ? "border-[#007BFF] bg-[#007BFF]/10" : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <Icon size={20} weight={selected ? "duotone" : "regular"} className={selected ? "text-[#007BFF]" : "text-slate-400"} />
                          <span className={`text-[11px] font-medium ${selected ? "text-[#007BFF]" : "text-slate-600"}`}>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {activityType === "OTHER" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Nome da atividade</label>
                    <input
                      value={customActivityName}
                      onChange={(e) => setCustomActivityName(e.target.value.slice(0, 40))}
                      placeholder="Ex.: Escalada, Tênis, CrossFit"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Data</label>
                    <input
                      type="date"
                      value={date}
                      max={todayInputValue()}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Horário (opcional)</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Duração (min)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={durationMin}
                      onChange={(e) => setDurationMin(e.target.value)}
                      placeholder="30"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Distância (km, opcional)</label>
                    <input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(e.target.value)}
                      placeholder="5.2"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">Intensidade (opcional)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {ACTIVITY_INTENSITIES.map((i) => (
                      <button
                        key={i.value}
                        type="button"
                        onClick={() => setIntensity((prev) => (prev === i.value ? null : i.value))}
                        className={`py-2 rounded-xl border-2 text-sm font-medium transition-colors ${
                          intensity === i.value ? "border-[#28A745] bg-[#28A745]/10 text-[#28A745]" : "border-slate-200 text-slate-600 bg-white"
                        }`}
                      >
                        {i.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Observação (opcional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, 300))}
                    placeholder="Ex.: Corrida no parque"
                    rows={2}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF] resize-none"
                  />
                </div>

                {allowShare && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-medium text-slate-500 mb-2">Compartilhar na Comunidade?</p>
                    <div className="space-y-2">
                      {[
                        { value: "NONE" as const, label: "Não compartilhar" },
                        { value: "GENERAL" as const, label: "Comunidade geral" },
                        ...(groups.length > 0 ? [{ value: "GROUP" as const, label: "Grupo específico" }] : []),
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 cursor-pointer transition-colors ${
                            shareTo === opt.value ? "border-[#007BFF] bg-[#007BFF]/5" : "border-slate-200"
                          }`}
                        >
                          <input
                            type="radio"
                            name="shareTo"
                            checked={shareTo === opt.value}
                            onChange={() => setShareTo(opt.value)}
                            className="accent-[#007BFF] w-4 h-4 flex-shrink-0"
                          />
                          <span className="text-sm text-slate-700">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                    {shareTo === "GROUP" && (
                      <select
                        value={groupId}
                        onChange={(e) => setGroupId(e.target.value)}
                        className="w-full mt-2 px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF] text-sm"
                      >
                        <option value="">Selecione um grupo</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {shareTo !== "NONE" && (
                      <p className="text-xs text-slate-400 mt-2">
                        Depois de salvar, o post abre pronto pra você adicionar legenda e foto antes de publicar.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-slate-100 flex gap-3 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !durationMin.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-[#007BFF] to-[#28A745] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Salvando...
                    </>
                  ) : (
                    "Salvar atividade"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
