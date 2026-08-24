// components/ActivityGoalModal.tsx
// Sheet reutilizável de criar/editar meta semanal de atividade. Usuário
// sempre escolhe o target — nunca um valor "ideal" pré-definido (checklist
// item 18). POST é upsert por métrica, então o mesmo modal serve pra criar
// e editar.
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useUpsertActivityGoal, type ActivityGoal, type ActivityGoalMetric } from "@/hooks/useActivityGoals";

const METRIC_OPTIONS: { value: ActivityGoalMetric; label: string; unit: string; placeholder: string }[] = [
  { value: "ACTIVE_DAYS", label: "Dias ativos por semana", unit: "dias/semana", placeholder: "Ex.: 3" },
  { value: "ACTIVITY_MINUTES", label: "Minutos ativos por semana", unit: "min/semana", placeholder: "Ex.: 150" },
  { value: "ACTIVITY_COUNT", label: "Quantidade de atividades por semana", unit: "por semana", placeholder: "Ex.: 4" },
];

export default function ActivityGoalModal({
  existingGoals,
  initialMetric,
  onClose,
}: {
  existingGoals: ActivityGoal[];
  initialMetric?: ActivityGoalMetric;
  onClose: () => void;
}) {
  const upsert = useUpsertActivityGoal();
  const [metric, setMetric] = useState<ActivityGoalMetric>(initialMetric ?? "ACTIVE_DAYS");
  const existing = existingGoals.find((g) => g.metric === metric);
  const [target, setTarget] = useState(existing?.target ? String(existing.target) : "");

  const option = METRIC_OPTIONS.find((o) => o.value === metric)!;

  const handleMetricChange = (next: ActivityGoalMetric) => {
    setMetric(next);
    const nextExisting = existingGoals.find((g) => g.metric === next);
    setTarget(nextExisting?.target ? String(nextExisting.target) : "");
  };

  const handleSave = () => {
    const value = Number(target);
    if (!target.trim() || Number.isNaN(value) || value <= 0) return;
    upsert.mutate({ metric, target: Math.round(value) }, { onSuccess: onClose });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">{existing ? "Editar meta semanal" : "Nova meta semanal"}</h3>
            <button onClick={onClose} aria-label="Fechar" className="p-2 -m-2 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <label className="block text-xs font-medium text-slate-500 mb-1.5">Tipo</label>
          <select
            value={metric}
            onChange={(e) => handleMetricChange(e.target.value as ActivityGoalMetric)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl mb-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
          >
            {METRIC_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <label className="block text-xs font-medium text-slate-500 mb-1.5">Meta ({option.unit})</label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={option.placeholder}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
          />
          <p className="text-xs text-slate-400 mt-1.5 mb-4">Você escolhe o valor — não existe uma meta &quot;ideal&quot; definida pelo sistema.</p>

          <button
            onClick={handleSave}
            disabled={!target.trim() || upsert.isPending}
            className="w-full py-3 bg-[#007BFF] hover:bg-[#0056b3] rounded-xl text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
          >
            {upsert.isPending && <Loader2 size={14} className="animate-spin" />}
            Salvar
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
