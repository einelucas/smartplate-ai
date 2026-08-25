// hooks/useHydration.tsx
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";

export interface HydrationLog {
  id: string;
  amountMl: number;
  loggedAt: string;
}

export interface DailyHydrationSummary {
  date: string;
  timezone: string;
  totalMl: number;
  goalMl: number;
  remainingMl: number;
  progressPercentage: number;
  goalCompleted: boolean;
  logs: HydrationLog[];
}

export interface DailyHydrationHistoryEntry {
  date: string;
  totalMl: number;
  goalMl: number;
  goalCompleted: boolean;
  logCount: number;
}

const SUMMARY_KEY = ["hydration", "summary"];
const HISTORY_KEY = ["hydration", "history"];

function invalidateHydrationRelated(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: SUMMARY_KEY });
  queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
  // Conclusão da meta diária pode desbloquear conquistas de hidratação /
  // BALANCED_WEEK (progresso recalculado no servidor a partir de dados reais).
  queryClient.invalidateQueries({ queryKey: ["achievements"] });
}

/** Sem `date`: resumo de hoje (chave usada pela atualização otimista de useAddWaterLog). Com `date`: resumo de um dia específico (ex.: dia selecionado no histórico). */
export function useHydrationSummary(date?: string) {
  const { isSignedIn } = useUser();
  return useQuery({
    queryKey: date ? [...SUMMARY_KEY, date] : SUMMARY_KEY,
    queryFn: async () => {
      const res = await fetch(date ? `/api/hydration/summary?date=${date}` : "/api/hydration/summary");
      if (!res.ok) throw new Error("Erro ao buscar hidratação");
      return (await res.json()) as DailyHydrationSummary;
    },
    enabled: isSignedIn,
  });
}

export function useHydrationHistory() {
  const { isSignedIn } = useUser();
  return useQuery({
    queryKey: HISTORY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/hydration/history");
      if (!res.ok) throw new Error("Erro ao buscar histórico de hidratação");
      const json = await res.json();
      return (json.days ?? []) as DailyHydrationHistoryEntry[];
    },
    enabled: isSignedIn,
  });
}

/**
 * Registra consumo com atualização otimista do resumo de hoje (revertida em
 * caso de falha) — feedback imediato nos botões +250/+500/Outro valor sem
 * esperar o round-trip. `onMutate` cancela a query em voo pra evitar que a
 * resposta antiga sobrescreva o estado otimista antes do POST responder.
 */
export function useAddWaterLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { amountMl: number }) => {
      const res = await fetch("/api/hydration/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erro ao registrar consumo de água");
      return data as { log: HydrationLog };
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: SUMMARY_KEY });
      const previous = queryClient.getQueryData<DailyHydrationSummary>(SUMMARY_KEY);
      if (previous) {
        const totalMl = previous.totalMl + input.amountMl;
        const optimisticLog: HydrationLog = { id: `optimistic-${Date.now()}`, amountMl: input.amountMl, loggedAt: new Date().toISOString() };
        queryClient.setQueryData<DailyHydrationSummary>(SUMMARY_KEY, {
          ...previous,
          totalMl,
          remainingMl: Math.max(0, previous.goalMl - totalMl),
          progressPercentage: previous.goalMl > 0 ? Math.min(100, Math.round((totalMl / previous.goalMl) * 100)) : 0,
          goalCompleted: totalMl >= previous.goalMl,
          logs: [optimisticLog, ...previous.logs],
        });
      }
      return { previous };
    },
    onError: (error: Error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(SUMMARY_KEY, context.previous);
      toast.error(error.message);
    },
    onSuccess: (data) => {
      const logId = data.log.id;
      toast.custom(
        (t) => (
          <div className={`flex items-center gap-3 bg-slate-800 text-white text-sm rounded-xl px-4 py-3 shadow-lg ${t.visible ? "opacity-100" : "opacity-0"}`}>
            <span>+{data.log.amountMl} ml registrados</span>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                fetch(`/api/hydration/logs/${logId}`, { method: "DELETE" })
                  .then((res) => {
                    if (!res.ok) throw new Error();
                    invalidateHydrationRelated(queryClient);
                  })
                  .catch(() => toast.error("Não foi possível desfazer o registro"));
              }}
              className="font-semibold text-[#66b3ff] hover:text-white transition-colors"
            >
              Desfazer
            </button>
          </div>
        ),
        { duration: 5000 }
      );
    },
    onSettled: () => invalidateHydrationRelated(queryClient),
  });
}

export function useUpdateWaterLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; amountMl?: number; loggedAt?: string }) => {
      const res = await fetch(`/api/hydration/logs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erro ao corrigir registro");
      return data as { log: HydrationLog };
    },
    onSuccess: () => {
      invalidateHydrationRelated(queryClient);
      toast.success("Registro corrigido");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteWaterLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/hydration/logs/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erro ao excluir registro");
      return data;
    },
    onSuccess: () => {
      invalidateHydrationRelated(queryClient);
      toast.success("Registro removido");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateWaterGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dailyWaterGoalMl: number) => {
      const res = await fetch("/api/hydration/goal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyWaterGoalMl }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erro ao salvar meta de água");
      return data as { dailyWaterGoalMl: number };
    },
    onSuccess: () => {
      invalidateHydrationRelated(queryClient);
      toast.success("Meta de água atualizada");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
