// hooks/useActivityInsights.ts
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";

export interface MonthlyEvolution {
  currentMonthKey: string;
  currentMonthMinutes: number;
  currentMonthActivities: number;
  previousMonthKey: string;
  previousMonthMinutes: number;
  previousMonthActivities: number;
  percentChange: number | null;
  currentMonthInProgress: boolean;
}

export interface ActivityInsightsResponse {
  stats: {
    thisWeek: { count: number; minutes: number; distinctDays: number };
    mostActiveWeek: { weekStartStr: string; minutes: number; count: number } | null;
    consistency: { activeWeeks: number; totalWeeks: number };
    monthlyEvolution: MonthlyEvolution | null;
    mealAdherencePercentage: number | null;
  };
  insights: string[];
  insightsSource: "ai" | "deterministic";
}

export function useActivityInsights() {
  const { isSignedIn } = useUser();
  return useQuery({
    queryKey: ["activity-insights"],
    queryFn: async () => {
      const res = await fetch("/api/activities/insights");
      if (!res.ok) throw new Error("Erro ao buscar insights de atividade");
      return (await res.json()) as ActivityInsightsResponse;
    },
    enabled: isSignedIn,
    // Servidor já cacheia por semana (ActivityInsight) — moderado no cliente
    // pra não refazer a chamada a cada foco de aba.
    staleTime: 5 * 60 * 1000,
  });
}
