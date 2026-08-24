// hooks/useActivityHistory.ts
// Camada de apresentação que combina ActivityLog (MANUAL, privado normal) e
// o cache privado de providers externos (ExternalActivityCache, hoje só
// Strava) num único DTO de UI — SEM persistir nem copiar dado entre as duas
// fontes. Internamente elas continuam completamente separadas (queries
// diferentes, tabelas diferentes, nunca um join). Isso é só para a tela
// conseguir mostrar "uma experiência", não "uma fonte".
import { useMemo } from "react";
import { useActivities, type ActivityLogEntry } from "./useActivities";
import { useConnectedApps, useExternalActivities, type ExternalCachedActivity } from "./useConnectedApps";
import { findActivityTypeLabel } from "@/lib/activity/options";

export type ActivityHistoryItem = {
  id: string;
  /** "MANUAL" para ActivityLog, ou o provider (ex.: "STRAVA") para dado externo. */
  source: string;
  title: string;
  activityType: string;
  performedAt: string;
  durationMin?: number;
  distanceKm?: number;
  intensity?: string | null;
  notes?: string | null;
  isPrivateExternal: boolean;
  providerUrl?: string;
  /** Registro original — só para ações (editar/excluir) que só existem para MANUAL. */
  raw: ActivityLogEntry | ExternalCachedActivity;
};

function activityDisplayName(activity: ActivityLogEntry): string {
  if (activity.activityType === "OTHER" && activity.customActivityName) return activity.customActivityName;
  return findActivityTypeLabel(activity.activityType);
}

/** URL pública oficial de uma atividade Strava — não expõe token, só o id numérico já armazenado. */
export function buildStravaActivityUrl(externalId: string): string {
  return `https://www.strava.com/activities/${externalId}`;
}

function buildProviderUrl(activity: ExternalCachedActivity): string | undefined {
  if (activity.provider === "STRAVA") return buildStravaActivityUrl(activity.externalId);
  return undefined;
}

export function useActivityHistory() {
  const manualQuery = useActivities();
  const connectedAppsQuery = useConnectedApps();
  const hasConnectedExternalProvider = (connectedAppsQuery.data?.apps ?? []).some((app) => app.status === "CONNECTED");
  const externalQuery = useExternalActivities(hasConnectedExternalProvider);

  const manualItems: ActivityHistoryItem[] = useMemo(
    () =>
      (manualQuery.data ?? []).map((activity) => ({
        id: activity.id,
        source: "MANUAL",
        title: activityDisplayName(activity),
        activityType: activity.activityType,
        performedAt: activity.performedAt,
        durationMin: activity.durationMin,
        distanceKm: activity.distanceKm ?? undefined,
        intensity: activity.intensity,
        notes: activity.notes,
        isPrivateExternal: false,
        raw: activity,
      })),
    [manualQuery.data]
  );

  const externalItems: ActivityHistoryItem[] = useMemo(
    () =>
      (externalQuery.data?.activities ?? []).map((activity) => ({
        id: activity.id,
        source: activity.provider,
        title: activity.name || findActivityTypeLabel(activity.activityType),
        activityType: activity.activityType,
        performedAt: activity.performedAt,
        durationMin: activity.durationMin,
        distanceKm: activity.distanceKm ?? undefined,
        isPrivateExternal: true,
        providerUrl: buildProviderUrl(activity),
        raw: activity,
      })),
    [externalQuery.data]
  );

  const allItems: ActivityHistoryItem[] = useMemo(
    () => [...manualItems, ...externalItems].sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()),
    [manualItems, externalItems]
  );

  return {
    manualItems,
    externalItems,
    allItems,
    isLoading: manualQuery.isLoading || (hasConnectedExternalProvider && externalQuery.isLoading),
    isError: manualQuery.isError || externalQuery.isError,
    hasConnectedExternalProvider,
  };
}
