// hooks/useAdmin.ts
// Centraliza toda a comunicação com /api/admin/** via React Query, seguindo
// o mesmo padrão de hooks/useCommunity.ts (queries/mutations + react-hot-toast
// + invalidateQueries). Nenhuma regra de negócio mora aqui — tudo é
// validado/decidido no backend (ver lib/admin/**).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { AdminDashboardStats, BetaCodeAdminRow, CreateBetaBatchResult, PremiumGrantAdminRow } from "@/types/admin";

async function apiFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Erro inesperado");
  return data as T;
}

const keys = {
  dashboard: ["admin", "dashboard"] as const,
  betaCodes: (params: Record<string, string | number | undefined>) => ["admin", "beta-codes", params] as const,
  premiumGrants: (params: Record<string, string | number | undefined>) => ["admin", "premium-grants", params] as const,
};

export function useAdminDashboard() {
  return useQuery({ queryKey: keys.dashboard, queryFn: () => apiFetch<AdminDashboardStats>("/api/admin/dashboard") });
}

export function useAdminBetaCodes(params: { status: string; batchId?: string; page: number; pageSize: number }) {
  const searchParams = new URLSearchParams();
  searchParams.set("status", params.status);
  if (params.batchId) searchParams.set("batchId", params.batchId);
  searchParams.set("page", String(params.page));
  searchParams.set("pageSize", String(params.pageSize));

  return useQuery({
    queryKey: keys.betaCodes(params),
    queryFn: () => apiFetch<{ rows: BetaCodeAdminRow[]; total: number }>(`/api/admin/beta/codes?${searchParams.toString()}`),
  });
}

export function useCreateBetaBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { quantity: number; durationDays: number; redeemUntil?: string }) =>
      apiFetch<CreateBetaBatchResult>("/api/admin/beta/codes", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "beta-codes"] });
      queryClient.invalidateQueries({ queryKey: keys.dashboard });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDisableBetaCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/beta/codes/${id}/disable`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "beta-codes"] });
      queryClient.invalidateQueries({ queryKey: keys.dashboard });
      toast.success("Código desativado");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useAdminPremiumGrants(params: { status: string; source: string; userId?: string; page: number; pageSize: number }) {
  const searchParams = new URLSearchParams();
  searchParams.set("status", params.status);
  searchParams.set("source", params.source);
  if (params.userId) searchParams.set("userId", params.userId);
  searchParams.set("page", String(params.page));
  searchParams.set("pageSize", String(params.pageSize));

  return useQuery({
    queryKey: keys.premiumGrants(params),
    queryFn: () => apiFetch<{ rows: PremiumGrantAdminRow[]; total: number }>(`/api/admin/premium/grants?${searchParams.toString()}`),
  });
}

export function useRevokePremiumGrant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch(`/api/admin/premium/grants/${id}/revoke`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "premium-grants"] });
      queryClient.invalidateQueries({ queryKey: keys.dashboard });
      toast.success("Premium revogado");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
