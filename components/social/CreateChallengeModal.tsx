// components/social/CreateChallengeModal.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useCreateChallenge } from "@/hooks/useCommunity";

const METRICS = [
  { value: "ACTIVE_DAYS", label: "Dias ativos" },
  { value: "MEAL_COMPLETIONS", label: "Refeições concluídas" },
  { value: "STREAK_DAYS", label: "Dias de sequência" },
];

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function CreateChallengeModal({
  scope,
  groupId,
  onClose,
}: {
  scope: "GLOBAL" | "GROUP";
  groupId?: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metric, setMetric] = useState("ACTIVE_DAYS");
  const [target, setTarget] = useState(7);
  const [rewardXp, setRewardXp] = useState(100);
  const [endsAt, setEndsAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return toDateInputValue(d);
  });

  const createChallenge = useCreateChallenge();

  const submit = () => {
    if (!title.trim()) return;
    createChallenge.mutate(
      {
        scope,
        groupId,
        title: title.trim(),
        description: description.trim() || undefined,
        metric: metric as "ACTIVE_DAYS" | "MEAL_COMPLETIONS" | "STREAK_DAYS",
        target,
        rewardXp,
        startsAt: new Date().toISOString(),
        endsAt: new Date(`${endsAt}T23:59:59`).toISOString(),
      },
      { onSuccess: onClose }
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Criar desafio</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 80))}
              placeholder="Título do desafio"
              className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 300))}
              placeholder="Descrição (opcional)"
              rows={2}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none resize-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Métrica</label>
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm mt-1"
                >
                  {METRICS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Meta</label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Recompensa (XP)</label>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  value={rewardXp}
                  onChange={(e) => setRewardXp(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Termina em</label>
                <input
                  type="date"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm mt-1"
                />
              </div>
            </div>
          </div>

          <button
            onClick={submit}
            disabled={createChallenge.isPending || !title.trim()}
            className="w-full mt-5 bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {createChallenge.isPending ? "Criando..." : "Criar desafio"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
