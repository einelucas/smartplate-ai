// hooks/useActivities.ts
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";

export interface ActivityLogEntry {
  id: string;
  activityType: string;
  customActivityName: string | null;
  durationMin: number;
  distanceKm: number | null;
  intensity: string | null;
  notes: string | null;
  performedAt: string;
  createdAt: string;
  updatedAt: string;
  sharedPost: { id: string } | null;
}

export interface ActivitySummary {
  thisWeek: { count: number; minutes: number };
  thisMonth: { count: number; minutes: number; distinctDays: number };
  lastActivity: {
    activityType: string;
    customActivityName: string | null;
    durationMin: number;
    distanceKm: number | null;
    performedAt: string;
  } | null;
}

export interface CreateActivityInput {
  activityType: string;
  customActivityName?: string;
  durationMin: number;
  distanceKm?: number | null;
  intensity?: string | null;
  notes?: string | null;
  performedAt: string;
}

const ACTIVITIES_KEY = ["activities"];
const SUMMARY_KEY = ["activities", "summary"];

function invalidateActivityRelated(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ACTIVITIES_KEY });
  queryClient.invalidateQueries({ queryKey: ["community", "gamification"] });
  queryClient.invalidateQueries({ queryKey: ["achievements"] });
  queryClient.invalidateQueries({ queryKey: ["community", "me"] });
}

export function useActivities() {
  const { isSignedIn } = useUser();
  return useQuery({
    queryKey: ACTIVITIES_KEY,
    queryFn: async () => {
      const res = await fetch("/api/activities");
      if (!res.ok) throw new Error("Erro ao buscar atividades");
      const json = await res.json();
      return (json.activities ?? []) as ActivityLogEntry[];
    },
    enabled: isSignedIn,
  });
}

export function useActivitySummary() {
  const { isSignedIn } = useUser();
  return useQuery({
    queryKey: SUMMARY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/activities/summary");
      if (!res.ok) throw new Error("Erro ao buscar resumo de atividades");
      return (await res.json()) as ActivitySummary;
    },
    enabled: isSignedIn,
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateActivityInput) => {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erro ao registrar atividade");
      return data as { activity: ActivityLogEntry; gamification: { xpAwarded: number; currentStreak?: number; newlyUnlocked: string[] } };
    },
    onSuccess: (data) => {
      invalidateActivityRelated(queryClient);
      toast.success(data.gamification.xpAwarded > 0 ? `Atividade registrada! +${data.gamification.xpAwarded} XP` : "Atividade registrada!");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CreateActivityInput> & { id: string }) => {
      const res = await fetch(`/api/activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erro ao atualizar atividade");
      return data as { activity: ActivityLogEntry };
    },
    onSuccess: () => {
      invalidateActivityRelated(queryClient);
      toast.success("Atividade atualizada!");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erro ao excluir atividade");
      return data;
    },
    onSuccess: () => {
      invalidateActivityRelated(queryClient);
      toast.success("Atividade removida");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
