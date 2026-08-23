// components/BetaCodeSection.tsx
// Conteúdo da etapa (opcional/pulável) de ativação de código Beta no
// onboarding. Nunca bloqueia o fluxo — usuário sem código só clica em
// Continuar sem preencher nada. Nunca persiste o código digitado (nem
// localStorage): só o resultado (ativo/expiresAt) via useBetaStatus,
// buscado do servidor.
"use client";

import { useState } from "react";
import { FlaskConical, Loader2, PartyPopper } from "lucide-react";
import { useBetaStatus, useRedeemBetaCode } from "@/hooks/useBetaCode";

function formatExpiryDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function BetaCodeSection() {
  const { data: status } = useBetaStatus();
  const redeem = useRedeemBetaCode();
  const [code, setCode] = useState("");
  const [successExpiresAt, setSuccessExpiresAt] = useState<string | null>(null);

  const activated = status?.active || successExpiresAt !== null;
  const effectiveExpiresAt = successExpiresAt ?? status?.expiresAt ?? null;

  if (activated && effectiveExpiresAt) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[#28A745]/10 to-[#007BFF]/10 border border-[#28A745]/30 p-5 flex items-start gap-3">
        <PartyPopper size={22} className="text-[#28A745] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-slate-800">Código Beta ativado!</p>
          <p className="text-sm text-slate-600 mt-1">Você recebeu 30 dias de SmartPlate Premium.</p>
          <p className="text-xs text-slate-500 mt-1">Acesso até {formatExpiryDate(effectiveExpiresAt)}.</p>
        </div>
      </div>
    );
  }

  const handleRedeem = () => {
    if (!code.trim() || redeem.isPending) return;
    redeem.mutate(code.trim(), {
      onSuccess: (data) => {
        if (data.expiresAt) setSuccessExpiresAt(data.expiresAt);
        setCode("");
      },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center text-center gap-2 py-2">
        <div className="w-14 h-14 rounded-2xl bg-[#007BFF]/10 flex items-center justify-center">
          <FlaskConical size={26} className="text-[#007BFF]" />
        </div>
        <p className="text-sm text-slate-500 max-w-xs">
          Se você recebeu um código de convite do Beta, ative aqui. Se não tiver, é só continuar — essa etapa é opcional.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Código Beta (opcional)</label>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 32))}
            placeholder="SPBETA-XXXX-XXXX-XXXX"
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF] font-mono text-sm tracking-wide"
          />
          <button
            type="button"
            onClick={handleRedeem}
            disabled={!code.trim() || redeem.isPending}
            className="px-4 py-3 bg-[#007BFF] hover:bg-[#0056b3] rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
          >
            {redeem.isPending ? <Loader2 size={14} className="animate-spin" /> : "Ativar"}
          </button>
        </div>
        {redeem.isError && <p className="text-xs text-red-500 mt-1.5">{redeem.error.message}</p>}
      </div>

      <p className="text-xs text-slate-400 text-center">Não tem um código? Sem problemas — clique em Continuar.</p>
    </div>
  );
}
