// hooks/useSubscriptionStatus.ts
// Status combinado de plano/assinatura (Stripe + PremiumGrant/Beta) — usado
// pelo card "Plano e assinatura" no Perfil e pela tela /subscribe. Nunca
// busca dado físico/privado — só o necessário pra exibir Free/Premium/Beta.
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";

export interface SubscriptionStatus {
  subscriptionActive: boolean;
  subscriptionTier: string | null;
  premium: {
    isPremium: boolean;
    source: "STRIPE" | "BETA_CODE" | "PROMO_CODE" | "ADMIN" | null;
    expiresAt: string | null;
  };
}

export function useSubscriptionStatus() {
  const { isSignedIn } = useUser();

  return useQuery({
    queryKey: ["profile", "subscription-status"],
    queryFn: async () => {
      const res = await fetch("/api/profile/subscription-status");
      if (!res.ok) throw new Error("Erro ao buscar status da assinatura");
      return (await res.json()) as SubscriptionStatus;
    },
    enabled: isSignedIn,
    staleTime: 30_000,
  });
}
