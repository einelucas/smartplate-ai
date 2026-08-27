// components/admin/BetaBatchResultModal.tsx
// Única tela em que os códigos aparecem em texto puro — o servidor nunca os
// persiste nem os expõe de novo depois desta resposta. Fechar esta tela
// (ou sair da página) torna os códigos permanentemente irrecuperáveis; não
// existe rota/consulta administrativa capaz de mostrá-los de novo.
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Check, Copy, Download } from "lucide-react";
import toast from "react-hot-toast";
import type { CreateBetaBatchResult } from "@/types/admin";

export default function BetaBatchResultModal({ result, onClose }: { result: CreateBetaBatchResult; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    await navigator.clipboard.writeText(result.codes.join("\n"));
    setCopied(true);
    toast.success("Códigos copiados");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCsv = () => {
    const csv = ["codigo", ...result.codes].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `beta-codes-${result.batchId.slice(0, 8)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
        >
          <h3 className="font-bold text-slate-800 mb-1">{result.codes.length} códigos foram criados</h3>

          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 my-4">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              <strong>Atenção:</strong> estes códigos não poderão ser visualizados novamente depois que você fechar esta janela. Copie ou baixe agora.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-56 overflow-y-auto mb-4">
            <ul className="font-mono text-xs text-slate-700 space-y-1">
              {result.codes.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={copyAll}
              className="flex items-center justify-center gap-1.5 text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl py-2.5"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              Copiar todos
            </button>
            <button
              onClick={downloadCsv}
              className="flex items-center justify-center gap-1.5 text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl py-2.5"
            >
              <Download size={14} />
              Baixar CSV
            </button>
          </div>

          <button onClick={onClose} className="w-full bg-[#007BFF] hover:bg-[#0069d9] text-white rounded-xl py-2.5 text-sm font-medium">
            Já salvei os códigos — fechar
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
