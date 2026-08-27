// components/admin/AdminBetaPanel.tsx
"use client";

import { useState } from "react";
import { Plus, Ban } from "lucide-react";
import { useAdminBetaCodes, useDisableBetaCode } from "@/hooks/useAdmin";
import { BETA_CODE_STATUS_LABELS } from "@/lib/beta/status";
import type { CreateBetaBatchResult } from "@/types/admin";
import StatusBadge from "./StatusBadge";
import CreateBetaBatchModal from "./CreateBetaBatchModal";
import BetaBatchResultModal from "./BetaBatchResultModal";

const STATUS_TABS = [
  { id: "ALL", label: "Todos" },
  { id: "AVAILABLE", label: "Disponíveis" },
  { id: "REDEEMED", label: "Utilizados" },
  { id: "DISABLED", label: "Desativados" },
  { id: "EXPIRED", label: "Expirados" },
];

const PAGE_SIZE = 20;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

function userLabel(user: { username: string | null; displayName: string | null; email: string } | null) {
  if (!user) return "—";
  return user.username ? `@${user.username}` : user.displayName || user.email;
}

export default function AdminBetaPanel() {
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [batchResult, setBatchResult] = useState<CreateBetaBatchResult | null>(null);

  const { data, isLoading } = useAdminBetaCodes({ status, page, pageSize: PAGE_SIZE });
  const disableCode = useDisableBetaCode();

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleDisable = (id: string) => {
    if (!confirm("Desativar código?\n\nEste código não poderá mais ser utilizado.")) return;
    disableCode.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Beta Codes</h2>
          <p className="text-sm text-slate-400">{total} código{total === 1 ? "" : "s"} no total</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 bg-[#007BFF] hover:bg-[#0069d9] text-white rounded-xl px-4 py-2.5 text-sm font-medium"
        >
          <Plus size={16} /> Criar lote
        </button>
      </div>

      <div className="flex bg-white border border-slate-200 p-1 rounded-xl w-fit overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setStatus(tab.id);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              status === tab.id ? "bg-[#007BFF] text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-slate-400">Carregando...</p>}

      {!isLoading && rows.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
          <p className="text-sm text-slate-500">Nenhum código encontrado.</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase">
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Duração</th>
                <th className="px-4 py-3 font-medium">Criado em</th>
                <th className="px-4 py-3 font-medium">Resgate até</th>
                <th className="px-4 py-3 font-medium">Resgatado em</th>
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">SPBETA-****-{row.codeHint ?? "????"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} label={BETA_CODE_STATUS_LABELS[row.status]} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.durationDays}d</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(row.redeemUntil)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(row.redeemedAt)}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{userLabel(row.redeemedByUser)}</td>
                  <td className="px-4 py-3">
                    {row.status === "AVAILABLE" && (
                      <button
                        onClick={() => handleDisable(row.id)}
                        disabled={disableCode.isPending}
                        className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
                      >
                        <Ban size={12} /> Desativar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-sm font-medium text-slate-600 disabled:opacity-30 hover:text-slate-800"
          >
            Anterior
          </button>
          <span className="text-sm text-slate-400">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-sm font-medium text-slate-600 disabled:opacity-30 hover:text-slate-800"
          >
            Próxima
          </button>
        </div>
      )}

      {showCreateModal && (
        <CreateBetaBatchModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(result) => {
            setShowCreateModal(false);
            setBatchResult(result);
          }}
        />
      )}

      {batchResult && <BetaBatchResultModal result={batchResult} onClose={() => setBatchResult(null)} />}
    </div>
  );
}
