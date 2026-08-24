// app/api/integrations/connected-apps/route.ts
// Lista o status de todo provider (conectado, não conectado ou "em breve")
// para a tela "Apps conectados" do Perfil. NUNCA retorna tokens — nem
// criptografados. Genérico: não é uma rota exclusiva do Strava.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStravaConfigured } from "@/lib/integrations/strava";

const AVAILABLE_PROVIDERS = ["STRAVA"] as const;
const COMING_SOON_PROVIDERS = ["GARMIN", "APPLE_HEALTH", "HEALTH_CONNECT", "SAMSUNG_HEALTH", "FITBIT"] as const;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connected = await prisma.connectedApp.findMany({
    where: { userId, status: "CONNECTED" },
    select: { provider: true, connectedAt: true, lastSyncedAt: true, scopes: true, lastError: true },
  });
  const byProvider = new Map(connected.map((c) => [c.provider, c]));

  const apps = [
    ...AVAILABLE_PROVIDERS.map((provider) => {
      const row = byProvider.get(provider);
      const configured = provider === "STRAVA" ? isStravaConfigured() : false;
      return {
        provider,
        status: row ? (row.lastError ? "ERROR" : "CONNECTED") : configured ? "NOT_CONNECTED" : "UNAVAILABLE",
        connectedAt: row?.connectedAt ?? null,
        lastSyncedAt: row?.lastSyncedAt ?? null,
        scopes: row?.scopes ?? [],
        lastError: row?.lastError ?? null,
      };
    }),
    ...COMING_SOON_PROVIDERS.map((provider) => ({
      provider,
      status: "COMING_SOON" as const,
      connectedAt: null,
      lastSyncedAt: null,
      scopes: [] as string[],
      lastError: null,
    })),
  ];

  return NextResponse.json({ apps });
}
