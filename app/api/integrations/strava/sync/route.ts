// app/api/integrations/strava/sync/route.ts
// Sincronização PRIVADA sob demanda (POST — nunca GET, para nunca ser
// disparada por prefetch/crawler: checklist item 45). Busca atividades
// autorizadas, normaliza e grava SOMENTE em ExternalActivityCache — nunca em
// ActivityLog, nunca em XpEvent (ver lib/integrations/provider-policy.ts:
// STRAVA.allowPublicGamification = false). Incremental via lastSyncedAt.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EXTERNAL_ACTIVITY_CACHE_MAX_DAYS } from "@/lib/integrations/provider-policy";
import { purgeExpiredExternalActivityCache } from "@/lib/integrations/external-activity-cache";
import { computeStravaSyncAfterEpoch, ensureFreshStravaAccessToken, fetchStravaActivities, normalizeStravaActivity } from "@/lib/integrations/strava";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connectedApp = await prisma.connectedApp.findUnique({
    where: { userId_provider: { userId, provider: "STRAVA" } },
  });
  if (!connectedApp || connectedApp.status !== "CONNECTED") {
    return NextResponse.json({ error: "Strava não está conectado" }, { status: 400 });
  }

  await purgeExpiredExternalActivityCache(userId);

  try {
    const { accessToken, refreshed } = await ensureFreshStravaAccessToken(connectedApp);

    const afterEpoch = computeStravaSyncAfterEpoch(connectedApp.lastSyncedAt);
    const activities = await fetchStravaActivities(accessToken, { after: afterEpoch, page: 1, perPage: 50 });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + EXTERNAL_ACTIVITY_CACHE_MAX_DAYS * 24 * 60 * 60 * 1000);

    for (const raw of activities) {
      const normalized = normalizeStravaActivity(raw);
      await prisma.externalActivityCache.upsert({
        where: { userId_provider_externalId: { userId, provider: "STRAVA", externalId: normalized.externalId } },
        create: {
          userId,
          provider: "STRAVA",
          externalId: normalized.externalId,
          activityType: normalized.activityType,
          name: normalized.name,
          durationMin: normalized.durationMin,
          distanceKm: normalized.distanceKm,
          performedAt: normalized.performedAt,
          expiresAt,
        },
        update: {
          activityType: normalized.activityType,
          name: normalized.name,
          durationMin: normalized.durationMin,
          distanceKm: normalized.distanceKm,
          performedAt: normalized.performedAt,
          cachedAt: now,
          expiresAt,
        },
      });
    }

    await prisma.connectedApp.update({
      where: { id: connectedApp.id },
      data: {
        lastSyncedAt: now,
        lastError: null,
        ...(refreshed
          ? {
              accessTokenEncrypted: refreshed.accessTokenEncrypted,
              refreshTokenEncrypted: refreshed.refreshTokenEncrypted,
              expiresAt: refreshed.expiresAt,
            }
          : {}),
      },
    });

    return NextResponse.json({ synced: activities.length, lastSyncedAt: now });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    await prisma.connectedApp.update({ where: { id: connectedApp.id }, data: { lastError: message } });
    console.error("Erro ao sincronizar Strava:", err);
    return NextResponse.json({ error: "Não foi possível sincronizar com o Strava agora" }, { status: 502 });
  }
}
