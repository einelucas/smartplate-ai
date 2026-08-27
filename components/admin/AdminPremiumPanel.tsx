// components/admin/AdminPremiumPanel.tsx
"use client";

import { useState } from "react";
import { ShieldOff } from "lucide-react";
import { useAdminPremiumGrants } from "@/hooks/useAdmin";
import type { PremiumGrantAdminRow } from "@/types/admin";
import StatusBadge from "./StatusBadge";
import RevokePremiumGrantModal from "./RevokePremiumGrantModal";

const STATUS_TABS = [
  { id: "ALL", label: "Todos" },
  { id: "ACTIVE", label: "Ativos" },
  { id: "EXPIRED", label: "Expirados" },
  { id: "REVOKED", label: "Revogados" },
];

const STATUS_LABELS: Record<string, string> = { ACTIVE: "Ativo", EXPIRED: "Expirado", REVOKED: "Revogado" };
const SOURCE_LABELS: Record<string, string> = { BETA_CODE: "Beta", PROMO_CODE: "Promo", ADMIN: "Admin" };

const PAGE_SIZE = 20;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

function userLabel(user: { username: string | null; displayName: string | null; email: string } | null, fallbackId: string) {
  if (!user) return fallbackId;
  return user.username ? `@${user.username}` : user.displayName || user.email;
}

export default function AdminPremiumPanel() {
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [revokeTarget, setRevokeTarget] = useState<PremiumGrantAdminRow | null>(null);

  const { data, isLoading } = useAdminPremiumGrants({ status, source: "ALL", page, pageSize: PAGE_SIZE });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Premium Grants</h2>
        <p className="text-sm text-slate-400">{total} concessõe{total === 1 ? "" : "s"} no total (não inclui assinaturas Stripe)</p>
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
          <p className="text-sm text-slate-500">Nenhuma concessão encontrada.</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase">
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">Origem</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Início</th>
                <th className="px-4 py-3 font-medium">Expira em</th>
                <th className="px-4 py-3 font-medium">Motivo revogação</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 text-slate-700">{userLabel(row.user, row.userId)}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{SOURCE_LABELS[row.source] ?? row.source}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} label={STATUS_LABELS[row.status]} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(row.startsAt)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(row.expiresAt)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate" title={row.revokedReason ?? undefined}>
                    {row.revokedReason ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {row.status === "ACTIVE" && (
                      <button
                        onClick={() => setRevokeTarget(row)}
                        className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600"
                      >
                        <ShieldOff size={12} /> Revogar
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

      {revokeTarget && <RevokePremiumGrantModal grant={revokeTarget} onClose={() => setRevokeTarget(null)} />}
    </div>
  );
}
