// components/HydrationHistoryModal.tsx
// Histórico semanal de hidratação — barras simples e acessíveis (sem nova
// biblioteca de gráficos, conforme diretriz do checklist) + lista de
// registros do dia selecionado, com edição e exclusão.
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Pencil, Trash2, Check, Droplets } from "lucide-react";
import { useHydrationHistory, useHydrationSummary, useUpdateWaterLog, useDeleteWaterLog, type HydrationLog } from "@/hooks/useHydration";

function todayLocalDateString(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(new Date());
}

function weekdayShort(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00.000Z`).toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" });
}

function dayMonth(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00.000Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
}

// Simplificação deliberada: hora exibida/editada no fuso do navegador (mesmo
// padrão já usado em RegisterActivityModal, sem seletor de timezone). A
// contagem oficial do dia/meta continua vindo do backend, que usa o fuso
// real do perfil — esta edição só ajusta o horário dentro do mesmo dia local.
function timeInputValue(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function LogRow({ log }: { log: HydrationLog }) {
  const updateLog = useUpdateWaterLog();
  const deleteLog = useDeleteWaterLog();
  const [editing, setEditing] = useState(false);
  const [amountMl, setAmountMl] = useState(String(log.amountMl));
  const [time, setTime] = useState(timeInputValue(log.loggedAt));

  const handleSave = () => {
    const value = Number(amountMl);
    if (!amountMl.trim() || !Number.isInteger(value) || value <= 0) return;
    const [hh, mm] = time.split(":").map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return;
    const original = new Date(log.loggedAt);
    const next = new Date(original);
    next.setHours(hh, mm, 0, 0);
    updateLog.mutate({ id: log.id, amountMl: value, loggedAt: next.toISOString() }, { onSuccess: () => setEditing(false) });
  };

  const handleDelete = () => {
    if (!confirm("Excluir este registro de água? Essa ação não pode ser desfeita.")) return;
    deleteLog.mutate(log.id);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50">
      <div className="w-9 h-9 rounded-lg bg-[#007BFF]/10 flex items-center justify-center flex-shrink-0">
        <Droplets size={16} className="text-[#007BFF]" />
      </div>

      {editing ? (
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={amountMl}
            onChange={(e) => setAmountMl(e.target.value)}
            aria-label="Quantidade em ml"
            className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-xs"
          />
          <span className="text-xs text-slate-400">ml às</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-label="Horário do registro"
            className="px-2 py-1 border border-slate-200 rounded-lg text-xs"
          />
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700">{log.amountMl.toLocaleString("pt-BR")} ml</p>
          <p className="text-xs text-slate-400">{timeInputValue(log.loggedAt)}</p>
        </div>
      )}

      <div className="flex items-center gap-1 flex-shrink-0">
        {editing ? (
          <button
            onClick={handleSave}
            disabled={updateLog.isPending}
            title="Salvar"
            aria-label="Salvar correção"
            className="p-2 text-[#28A745] hover:bg-[#28A745]/10 rounded-lg disabled:opacity-50"
          >
            {updateLog.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          </button>
        ) : (
          <>
            <button onClick={() => setEditing(true)} title="Corrigir" aria-label="Corrigir registro" className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
              <Pencil size={14} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLog.isPending}
              title="Excluir"
              aria-label="Excluir registro"
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function HydrationHistoryModal({ onClose }: { onClose: () => void }) {
  const { data: days, isLoading: isHistoryLoading, isError: isHistoryError } = useHydrationHistory();
  const [selectedDate, setSelectedDate] = useState(todayLocalDateString());
  const { data: daySummary, isLoading: isDayLoading } = useHydrationSummary(selectedDate);

  const maxTotal = Math.max(1, ...(days ?? []).map((d) => Math.max(d.totalMl, d.goalMl)));

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
            <h2 className="text-lg font-bold text-slate-800">Histórico de hidratação</h2>
            <button type="button" onClick={onClose} aria-label="Fechar" title="Fechar" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={18} className="text-slate-400" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto flex-1">
            {isHistoryLoading && <p className="text-sm text-slate-400 text-center py-4">Carregando...</p>}
            {isHistoryError && !isHistoryLoading && <p className="text-sm text-slate-400 text-center py-8">Não foi possível carregar o histórico.</p>}

            {!isHistoryLoading && !isHistoryError && (
              <>
                <div role="group" aria-label="Últimos 7 dias" className="flex items-end justify-between gap-2 h-32 mb-2">
                  {(days ?? []).map((day) => {
                    const heightPct = Math.max(4, Math.round((day.totalMl / maxTotal) * 100));
                    const isSelected = day.date === selectedDate;
                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => setSelectedDate(day.date)}
                        aria-pressed={isSelected}
                        aria-label={`${weekdayShort(day.date)}, ${dayMonth(day.date)}: ${day.totalMl.toLocaleString("pt-BR")} de ${day.goalMl.toLocaleString(
                          "pt-BR"
                        )} ml${day.goalCompleted ? ", meta atingida" : ""}`}
                        className="flex-1 flex flex-col items-center gap-1.5 group"
                      >
                        <div className="w-full h-24 flex items-end rounded-md bg-slate-50">
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full rounded-md transition-all ${
                              day.goalCompleted ? "bg-[#28A745]" : "bg-[#007BFF]/60"
                            } ${isSelected ? "ring-2 ring-offset-1 ring-[#007BFF]" : "group-hover:opacity-80"}`}
                          />
                        </div>
                        <span className={`text-[10px] uppercase font-medium ${isSelected ? "text-[#007BFF]" : "text-slate-400"}`}>{weekdayShort(day.date)}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-700">{dayMonth(selectedDate)}</p>
                    {daySummary && (
                      <p className="text-xs text-slate-500">
                        {daySummary.totalMl.toLocaleString("pt-BR")} / {daySummary.goalMl.toLocaleString("pt-BR")} ml
                        {daySummary.goalCompleted ? " • meta atingida" : ""}
                      </p>
                    )}
                  </div>

                  {isDayLoading && <p className="text-sm text-slate-400 text-center py-4">Carregando...</p>}
                  {!isDayLoading && daySummary?.logs.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Nenhum registro neste dia.</p>}
                  {!isDayLoading && daySummary && daySummary.logs.length > 0 && (
                    <div className="space-y-0.5">
                      {daySummary.logs.map((log) => (
                        <LogRow key={log.id} log={log} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
