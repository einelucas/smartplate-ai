// components/BetaTesterBadge.tsx
// Exibição discreta do status de Beta no Perfil. Não publica nada na
// Comunidade nem altera SocialProfile — é só leitura de /api/beta/status.
"use client";

import { FlaskConical } from "lucide-react";
import { useBetaStatus } from "@/hooks/useBetaCode";

function formatExpiryDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function BetaTesterBadge() {
  const { data: status } = useBetaStatus();

  if (!status?.redeemed) return null;

  return (
    <div
      className={`rounded-2xl p-4 border flex items-center gap-3 ${
        status.active ? "bg-gradient-to-br from-[#28A745]/10 to-[#007BFF]/10 border-[#28A745]/30" : "bg-slate-50 border-slate-200"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          status.active ? "bg-[#28A745]/15 text-[#28A745]" : "bg-slate-200 text-slate-400"
        }`}
      >
        <FlaskConical size={18} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">🧪 Beta Tester</p>
        {status.active && status.expiresAt ? (
          <p className="text-xs text-slate-500">SmartPlate Premium Beta · até {formatExpiryDate(status.expiresAt)}</p>
        ) : (
          <p className="text-xs text-slate-400">Período Premium encerrado</p>
        )}
      </div>
    </div>
  );
}
