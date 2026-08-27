// components/admin/AdminDashboard.tsx
"use client";

import Link from "next/link";
import { Users, Ticket, Crown } from "lucide-react";
import { useAdminDashboard } from "@/hooks/useAdmin";

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-bold text-slate-800">{value}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const { data, isLoading, isError } = useAdminDashboard();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Visão geral</h2>
        <p className="text-sm text-slate-400">Métricas calculadas em tempo real a partir do banco.</p>
      </div>

      {isLoading && <p className="text-sm text-slate-400">Carregando...</p>}
      {isError && <p className="text-sm text-red-500">Não foi possível carregar as métricas.</p>}

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 bg-[#007BFF]/10 rounded-xl flex items-center justify-center">
                <Users size={16} className="text-[#007BFF]" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">Usuários cadastrados</h3>
            </div>
            <p className="text-3xl font-bold text-slate-800">{data.usersCount}</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center">
                  <Ticket size={16} className="text-orange-500" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">Beta Codes</h3>
              </div>
              <Link href="/admin/beta" className="text-xs font-medium text-[#007BFF] hover:underline">
                Ver todos
              </Link>
            </div>
            <StatRow label="Total" value={data.betaCodes.total} />
            <StatRow label="Disponíveis" value={data.betaCodes.available} />
            <StatRow label="Utilizados" value={data.betaCodes.redeemed} />
            <StatRow label="Desativados" value={data.betaCodes.disabled} />
            <StatRow label="Expirados" value={data.betaCodes.expired} />
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-[#28A745]/10 rounded-xl flex items-center justify-center">
                  <Crown size={16} className="text-[#28A745]" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">Premium Grants</h3>
              </div>
              <Link href="/admin/premium" className="text-xs font-medium text-[#007BFF] hover:underline">
                Ver todos
              </Link>
            </div>
            <StatRow label="Ativos" value={data.premiumGrants.active} />
            <StatRow label="Expirados" value={data.premiumGrants.expired} />
            <StatRow label="Revogados" value={data.premiumGrants.revoked} />
          </div>
        </div>
      )}
    </div>
  );
}
