// components/PlanSubscriptionCard.tsx
// Card resumido de "Plano e assinatura" no Perfil — Free/Premium(Stripe)/
// Premium Beta, sempre com dado real (hooks/useSubscriptionStatus.ts).
// Substitui o antigo BetaTesterBadge (só cobria o caso Beta); este cobre os
// três estados num único lugar. Leva sempre pra /subscribe — nunca cria uma
// segunda tela de assinatura.
"use client";

import Link from "next/link";
import { ArrowRight, FlaskConical, Sparkles } from "lucide-react";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

function formatExpiryDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PlanSubscriptionCard() {
  const { data, isLoading } = useSubscriptionStatus();

  if (isLoading || !data) {
    return <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-[76px] animate-pulse" />;
  }

  const isBeta = data.premium.isPremium && data.premium.source === "BETA_CODE";
  const isPremium = data.premium.isPremium;

  if (isBeta) {
    return (
      <Link
        href="/subscribe"
        className="block bg-gradient-to-br from-[#28A745]/10 to-[#007BFF]/10 border border-[#28A745]/30 rounded-2xl p-5 hover:opacity-90 transition-opacity min-h-[44px]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <FlaskConical size={16} className="text-[#28A745] flex-shrink-0" /> SmartPlate Premium Beta
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {data.premium.expiresAt ? `Acesso até ${formatExpiryDate(data.premium.expiresAt)}` : "Acesso Beta ativo"}
            </p>
          </div>
          <span className="text-xs font-semibold text-[#007BFF] flex items-center gap-1 flex-shrink-0">
            Ver detalhes <ArrowRight size={12} />
          </span>
        </div>
      </Link>
    );
  }

  if (isPremium) {
    return (
      <Link
        href="/subscribe"
        className="block bg-gradient-to-br from-[#007BFF]/10 to-[#28A745]/10 border border-[#007BFF]/30 rounded-2xl p-5 hover:opacity-90 transition-opacity min-h-[44px]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <Sparkles size={16} className="text-[#007BFF] flex-shrink-0" /> SmartPlate Premium
            </p>
            <p className="text-xs text-slate-500 mt-1">Sua assinatura está ativa.</p>
          </div>
          <span className="text-xs font-semibold text-[#007BFF] flex items-center gap-1 flex-shrink-0">
            Gerenciar <ArrowRight size={12} />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href="/subscribe"
      className="block bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:bg-slate-50 transition-colors min-h-[44px]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-400">Seu plano</p>
          <p className="text-sm font-semibold text-slate-800 mt-0.5">SmartPlate Free</p>
        </div>
        <span className="text-xs font-semibold text-[#007BFF] flex items-center gap-1 flex-shrink-0">
          Ver planos <ArrowRight size={12} />
        </span>
      </div>
    </Link>
  );
}
