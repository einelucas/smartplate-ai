// app/subscribe/page.tsx
"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { availablePlans } from "@/lib/plans";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import { Check, Sparkles, Zap, Star, Crown, FlaskConical } from "lucide-react";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import BetaPlanSection from "@/components/BetaPlanSection";

const planStyle: Record<string, { icon: typeof Zap; color: string; badge?: string; highlight?: boolean }> = {
  semana: { icon: Zap, color: "from-blue-400 to-blue-600" },
  mes: { icon: Star, color: "from-[#007BFF] to-[#28A745]", badge: "Mais Popular", highlight: true },
  ano: { icon: Crown, color: "from-amber-400 to-orange-500", badge: "Melhor Valor" },
};

type SubscribeResponse = { url: string };
type SubscribeError = { error: string };

const subscribeToPlan = async ({
  planType,
  userId,
  email,
}: {
  planType: string;
  userId: string;
  email: string;
}): Promise<SubscribeResponse> => {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planType, userId, email }),
  });

  if (!res.ok) {
    const errorData: SubscribeError = await res.json();
    throw new Error(errorData.error || "Algo deu errado.");
  }

  return res.json();
};

function formatExpiryDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function CurrentPlanBanner() {
  const { data } = useSubscriptionStatus();
  if (!data?.premium.isPremium) return null;

  const isBeta = data.premium.source === "BETA_CODE";

  return (
    <div
      className={`max-w-md mx-auto mb-8 rounded-2xl border p-4 flex items-center gap-3 text-left ${
        isBeta ? "bg-gradient-to-br from-[#28A745]/10 to-[#007BFF]/10 border-[#28A745]/30" : "bg-[#007BFF]/5 border-[#007BFF]/20"
      }`}
    >
      {isBeta ? <FlaskConical size={20} className="text-[#28A745] flex-shrink-0" /> : <Sparkles size={20} className="text-[#007BFF] flex-shrink-0" />}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{isBeta ? "SmartPlate Premium Beta" : "SmartPlate Premium"}</p>
        <p className="text-xs text-slate-500">
          {isBeta && data.premium.expiresAt
            ? `Acesso até ${formatExpiryDate(data.premium.expiresAt)}`
            : "Sua assinatura está ativa — obrigado por fazer parte do SmartPlate."}
        </p>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  const { user } = useUser();
  const router = useRouter();
  const [selected, setSelected] = useState("mes");

  const userId = user?.id;
  const email = user?.emailAddresses?.[0]?.emailAddress || "";

  const mutation = useMutation<SubscribeResponse, Error, { planType: string }>({
    mutationFn: async ({ planType }) => {
      if (!userId) throw new Error("Usuário não autenticado.");
      return subscribeToPlan({ planType, userId, email });
    },
    onMutate: () => {
      toast.success("Redirecionando para o pagamento...", { id: "subscribe" });
    },
    onSuccess: (data) => {
      toast.success("Redirecionando para o checkout!", { id: "subscribe" });
      window.location.href = data.url;
    },
    onError: (error) => {
      toast.error(error.message || "Algo deu errado.", { id: "subscribe" });
    },
  });

  const handleSubscribe = (planType: string) => {
    if (!userId) {
      router.push("/sign-up");
      return;
    }
    mutation.mutate({ planType });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 md:p-10">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-[#007BFF]/10 text-[#007BFF] px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
          <Sparkles size={14} />
          Escolha seu plano
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
          Transforme sua alimentação
          <br />
          com IA personalizada
        </h1>
        <p className="text-slate-500 max-w-xl mx-auto text-base">
          Planos flexíveis para você atingir seus objetivos com saúde e praticidade.
        </p>
      </div>

      <CurrentPlanBanner />
      <BetaPlanSection />

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {availablePlans.map((plan, idx) => {
          const style = planStyle[plan.interval] ?? planStyle.semana;
          const Icon = style.icon;
          const isSelected = selected === plan.interval;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setSelected(plan.interval)}
              className={`relative cursor-pointer rounded-2xl border-2 bg-white transition-all duration-300 overflow-hidden ${
                style.highlight
                  ? "border-[#007BFF] shadow-xl shadow-[#007BFF]/20 md:scale-105"
                  : isSelected
                  ? "border-slate-400 shadow-lg"
                  : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
              }`}
            >
              {style.badge && (
                <div className={`absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full text-white bg-gradient-to-r ${style.color}`}>
                  {style.badge}
                </div>
              )}

              <div className={`h-1.5 w-full bg-gradient-to-r ${style.color}`} />

              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${style.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">{plan.name}</h2>
                    <p className="text-xs text-slate-400">{plan.description}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-sm text-slate-400 mb-1">R$</span>
                    <span className="text-4xl font-extrabold text-slate-800">{plan.amount.toFixed(2).replace(".", ",")}</span>
                  </div>
                  <span className="text-sm text-slate-400">por {plan.interval}</span>
                </div>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check size={15} className="text-[#28A745] mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    style.highlight
                      ? "bg-gradient-to-r from-[#007BFF] to-[#28A745] text-white shadow-md hover:opacity-90"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubscribe(plan.interval);
                  }}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Aguarde..." : `Assinar ${plan.name}`}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-400 mt-8">Cancele a qualquer momento. Sem taxas ocultas. Pagamento seguro.</p>
    </div>
  );
}
