// components/social/ReportModal.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Flag } from "lucide-react";
import { useCreateReport } from "@/hooks/useCommunity";

const REASONS: { value: string; label: string }[] = [
  { value: "SPAM", label: "Spam ou propaganda" },
  { value: "HARASSMENT", label: "Assédio ou bullying" },
  { value: "HATE", label: "Discurso de ódio" },
  { value: "SEXUAL", label: "Conteúdo sexual" },
  { value: "DANGEROUS_HEALTH_ADVICE", label: "Conselho de saúde perigoso" },
  { value: "MISINFORMATION", label: "Desinformação" },
  { value: "OTHER", label: "Outro motivo" },
];

export default function ReportModal({
  targetType,
  targetId,
  onClose,
}: {
  targetType: "POST" | "COMMENT" | "USER";
  targetId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("SPAM");
  const [details, setDetails] = useState("");
  const createReport = useCreateReport();

  const submit = () => {
    createReport.mutate(
      { targetType, targetId, reason, details: details.trim() || undefined },
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
          className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flag size={18} className="text-red-500" />
              <h3 className="font-bold text-slate-800">Denunciar</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-2 mb-4">
            {REASONS.map((r) => (
              <label
                key={r.value}
                className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer text-sm ${
                  reason === r.value ? "border-[#007BFF] bg-[#007BFF]/5 text-[#007BFF]" : "border-slate-200 text-slate-600"
                }`}
              >
                <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-[#007BFF]" />
                {r.label}
              </label>
            ))}
          </div>

          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value.slice(0, 500))}
            placeholder="Detalhes adicionais (opcional)"
            className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-700 resize-none mb-4"
            rows={3}
          />

          <button
            onClick={submit}
            disabled={createReport.isPending}
            className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {createReport.isPending ? "Enviando..." : "Enviar denúncia"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
