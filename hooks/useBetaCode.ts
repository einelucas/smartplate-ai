// hooks/useBetaCode.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";

export interface BetaStatus {
  redeemed: boolean;
  active: boolean;
  expiresAt: string | null;
}

const QUERY_KEY = ["beta", "status"];

export function useBetaStatus() {
  const { isSignedIn } = useUser();

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/beta/status");
      if (!res.ok) throw new Error("Erro ao buscar status do Beta");
      return (await res.json()) as BetaStatus;
    },
    enabled: isSignedIn,
  });
}

export function useRedeemBetaCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/beta/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao ativar código Beta");
      }
      return data as { success: true; alreadyRedeemed: boolean; expiresAt: string | null };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
