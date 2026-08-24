// hooks/useActivityGoals.ts
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";

export type ActivityGoalMetric = "ACTIVE_DAYS" | "ACTIVITY_MINUTES" | "ACTIVITY_COUNT";

export interface ActivityGoalProgress {
  id: string;
  metric: ActivityGoalMetric;
  target: number;
  current: number;
  percentage: number;
}

export interface ActivityGoal {
  id: string;
  userId: string;
  metric: ActivityGoalMetric;
  target: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  progress: ActivityGoalProgress;
}

export interface ActivityGoalsResponse {
  goals: ActivityGoal[];
  week: { start: string; end: string };
  streak: { weeks: number; basedOnGoals: boolean };
}

const GOALS_KEY = ["activity-goals"];

function invalidateGoalRelated(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: GOALS_KEY });
  queryClient.invalidateQueries({ queryKey: ["achievements"] });
  queryClient.invalidateQueries({ queryKey: ["activity-insights"] });
}

export function useActivityGoals() {
  const { isSignedIn } = useUser();
  return useQuery({
    queryKey: GOALS_KEY,
    queryFn: async () => {
      const res = await fetch("/api/activities/goals");
      if (!res.ok) throw new Error("Erro ao buscar metas");
      return (await res.json()) as ActivityGoalsResponse;
    },
    enabled: isSignedIn,
  });
}

/** Cria ou atualiza (upsert por métrica — cada usuário só tem 1 meta ativa por métrica). */
export function useUpsertActivityGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { metric: ActivityGoalMetric; target: number }) => {
      const res = await fetch("/api/activities/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erro ao salvar meta");
      return data as { goal: ActivityGoal };
    },
    onSuccess: () => {
      invalidateGoalRelated(queryClient);
      toast.success("Meta salva!");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateActivityGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; target?: number; isActive?: boolean }) => {
      const res = await fetch(`/api/activities/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erro ao atualizar meta");
      return data as { goal: ActivityGoal };
    },
    onSuccess: () => invalidateGoalRelated(queryClient),
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteActivityGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/activities/goals/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erro ao remover meta");
      return data;
    },
    onSuccess: () => {
      invalidateGoalRelated(queryClient);
      toast.success("Meta removida");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
