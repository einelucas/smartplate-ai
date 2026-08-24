// hooks/useConnectedApps.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useUser } from "@clerk/nextjs";

export type ConnectedAppStatus = "CONNECTED" | "NOT_CONNECTED" | "ERROR" | "COMING_SOON" | "UNAVAILABLE";

export interface ConnectedAppEntry {
  provider: string;
  status: ConnectedAppStatus;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  scopes: string[];
  lastError: string | null;
}

const CONNECTED_APPS_KEY = ["connected-apps"];
// Genérica de propósito (não "strava-activities") — hoje só o Strava está
// conectado, mas a query key/endpoint já são pensados para qualquer provider
// externo futuro (ver GET /api/integrations/strava/activities, que hoje é o
// único endpoint real, mas devolve o campo `provider` em cada linha).
const EXTERNAL_ACTIVITIES_KEY = ["external-activities"];

export function useConnectedApps() {
  const { isSignedIn } = useUser();
  return useQuery({
    queryKey: CONNECTED_APPS_KEY,
    queryFn: async () => {
      const res = await fetch("/api/integrations/connected-apps");
      if (!res.ok) throw new Error("Erro ao buscar apps conectados");
      return (await res.json()) as { apps: ConnectedAppEntry[] };
    },
    enabled: isSignedIn,
    staleTime: 30_000,
  });
}

export function useSyncStrava() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/integrations/strava/sync", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erro ao sincronizar com o Strava");
      return data as { synced: number; lastSyncedAt: string };
    },
    onSuccess: (data) => {
      // Nunca invalidar gamificação/ranking/desafios/achievements aqui — dado
      // do Strava é privado e não deve reavaliar nada disso (ver
      // lib/integrations/provider-policy.ts).
      queryClient.invalidateQueries({ queryKey: CONNECTED_APPS_KEY });
      queryClient.invalidateQueries({ queryKey: EXTERNAL_ACTIVITIES_KEY });
      toast.success(`${data.synced} atividade(s) sincronizada(s) do Strava`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDisconnectStrava() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/integrations/strava/disconnect", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erro ao desconectar o Strava");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONNECTED_APPS_KEY });
      queryClient.invalidateQueries({ queryKey: EXTERNAL_ACTIVITIES_KEY });
      toast.success("Strava desconectado");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export interface ExternalCachedActivity {
  id: string;
  provider: string;
  externalId: string;
  activityType: string;
  name: string | null;
  durationMin: number;
  distanceKm: number | null;
  performedAt: string;
  expiresAt: string;
}

/** Todo o cache privado de atividades externas do usuário (hoje: só Strava). */
export function useExternalActivities(enabled: boolean) {
  return useQuery({
    queryKey: EXTERNAL_ACTIVITIES_KEY,
    queryFn: async () => {
      const res = await fetch("/api/integrations/strava/activities");
      if (!res.ok) throw new Error("Erro ao buscar atividades externas");
      return (await res.json()) as { activities: ExternalCachedActivity[] };
    },
    enabled,
    staleTime: 60_000,
  });
}
