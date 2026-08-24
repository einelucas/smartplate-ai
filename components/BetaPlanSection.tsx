// components/BetaPlanSection.tsx
// Seção condicional de resgate/status do Código Beta na tela /subscribe
// (checklist Parte B). Nunca mostra formulário pra quem já usou um código
// (item 8) nem incentiva resgate pra quem já é Premium pago via Stripe
// (item 9 — a própria API /api/beta/redeem já bloqueia isso; aqui só evita
// mostrar a seção à toa).
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { FlaskConical } from "lucide-react";
import { useBetaStatus } from "@/hooks/useBetaCode";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

const BetaCodeRedeemModal = dynamic(() => import("./BetaCodeRedeemModal"), { ssr: false });

function formatExpiryDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function BetaPlanSection() {
  const { data: betaStatus } = useBetaStatus();
  const { data: subStatus } = useSubscriptionStatus();
  const [showModal, setShowModal] = useState(false);

  if (!betaStatus || !subStatus || subStatus.subscriptionActive) return null;

  if (!betaStatus.redeemed) {
    return (
      <>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-md mx-auto mb-8 text-center">
          <FlaskConical size={22} className="text-[#007BFF] mx-auto mb-2" />
          <p className="font-semibold text-slate-800 text-sm">Tem um código Beta?</p>
          <p className="text-xs text-slate-500 mt-1 mb-3">
            Se você recebeu um código de acesso durante o período Beta, ative-o aqui.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl text-sm font-semibold min-h-[44px]"
          >
            Inserir código Beta
          </button>
        </div>
        {showModal && <BetaCodeRedeemModal onClose={() => setShowModal(false)} />}
      </>
    );
  }

  return (
    <div
      className={`border rounded-2xl p-5 max-w-md mx-auto mb-8 text-center ${
        betaStatus.active ? "bg-gradient-to-br from-[#28A745]/10 to-[#007BFF]/10 border-[#28A745]/30" : "bg-slate-50 border-slate-200"
      }`}
    >
      <FlaskConical size={22} className={`mx-auto mb-2 ${betaStatus.active ? "text-[#28A745]" : "text-slate-400"}`} />
      {betaStatus.active && betaStatus.expiresAt ? (
        <>
          <p className="font-semibold text-slate-800 text-sm">🧪 Premium Beta</p>
          <p className="text-xs text-slate-500 mt-1">Ativo até: {formatExpiryDate(betaStatus.expiresAt)}</p>
        </>
      ) : (
        <>
          <p className="font-semibold text-slate-800 text-sm">🧪 Beta Tester</p>
          <p className="text-xs text-slate-500 mt-1">Seu período Premium Beta terminou.</p>
        </>
      )}
    </div>
  );
}
