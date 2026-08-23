// components/social/ModerationDashboard.tsx
"use client";

import { useState } from "react";
import { ShieldAlert, EyeOff, Trash2, Check, X, User as UserIcon } from "lucide-react";
import { useHidePost, useModerationReports, useResolveReport } from "@/hooks/useCommunity";
import type { ModerationReportEntry } from "@/types/community";

const STATUS_TABS = [
  { id: "PENDING", label: "Pendentes" },
  { id: "RESOLVED", label: "Resolvidas" },
  { id: "DISMISSED", label: "Dispensadas" },
];

const REASON_LABELS: Record<string, string> = {
  SPAM: "Spam",
  HARASSMENT: "Assédio",
  HATE: "Discurso de ódio",
  SEXUAL: "Conteúdo sexual",
  DANGEROUS_HEALTH_ADVICE: "Conselho de saúde perigoso",
  MISINFORMATION: "Desinformação",
  OTHER: "Outro",
};

export default function ModerationDashboard() {
  const [status, setStatus] = useState("PENDING");
  const { data, isLoading } = useModerationReports(status);
  const hidePost = useHidePost();
  const resolveReport = useResolveReport();

  const reports = data?.reports ?? [];

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
          <ShieldAlert className="text-red-500" size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Moderação</h1>
          <p className="text-sm text-slate-400">Denúncias da Comunidade</p>
        </div>
      </div>

      <div className="flex bg-white border border-slate-200 p-1 rounded-xl w-fit mb-6">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatus(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              status === tab.id ? "bg-[#007BFF] text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-slate-400">Carregando...</p>}

      {!isLoading && reports.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
          <p className="text-sm text-slate-500">Nenhuma denúncia {status === "PENDING" ? "pendente" : "aqui"}.</p>
        </div>
      )}

      <div className="space-y-4">
        {reports.map((report: ModerationReportEntry) => (
          <div key={report.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
                  {report.targetType}
                </span>
                <span className="text-xs text-red-500 font-medium">{REASON_LABELS[report.reason] ?? report.reason}</span>
              </div>
              <span className="text-xs text-slate-400">{new Date(report.createdAt).toLocaleString("pt-BR")}</span>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-3 text-sm text-slate-600">
              {report.targetType === "POST" && (report.preview?.text || <em className="text-slate-400">Post sem texto (tipo {report.preview?.type})</em>)}
              {report.targetType === "COMMENT" && (report.preview?.text || <em className="text-slate-400">Comentário não encontrado</em>)}
              {report.targetType === "USER" && (
                <span className="flex items-center gap-1.5">
                  <UserIcon size={14} /> @{report.preview?.username}
                </span>
              )}
              {!report.preview && <em className="text-slate-400">Conteúdo não encontrado (pode já ter sido removido)</em>}
            </div>

            {report.details && <p className="text-xs text-slate-500 mb-3">Detalhes do denunciante: {report.details}</p>}
            <p className="text-xs text-slate-400 mb-3">Denunciado por @{report.reporter?.username ?? "desconhecido"}</p>

            {status === "PENDING" && (
              <div className="flex flex-wrap gap-2">
                {report.targetType === "POST" && (
                  <button
                    onClick={() => hidePost.mutate(report.targetId)}
                    className="flex items-center gap-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-3 py-1.5"
                  >
                    <EyeOff size={12} /> Ocultar post
                  </button>
                )}
                {report.targetType === "COMMENT" && (
                  <button
                    onClick={async () => {
                      await fetch(`/api/community/comments/${report.targetId}`, { method: "DELETE" });
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-3 py-1.5"
                  >
                    <Trash2 size={12} /> Excluir comentário
                  </button>
                )}
                <button
                  onClick={() => resolveReport.mutate({ reportId: report.id, status: "RESOLVED" })}
                  className="flex items-center gap-1.5 text-xs font-medium bg-[#28A745] hover:bg-[#219a3a] text-white rounded-lg px-3 py-1.5"
                >
                  <Check size={12} /> Resolver
                </button>
                <button
                  onClick={() => resolveReport.mutate({ reportId: report.id, status: "DISMISSED" })}
                  className="flex items-center gap-1.5 text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg px-3 py-1.5"
                >
                  <X size={12} /> Dispensar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
