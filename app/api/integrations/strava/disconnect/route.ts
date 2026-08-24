// app/api/integrations/strava/disconnect/route.ts
// Desconecta o Strava: tenta revogar a autorização oficial, sempre apaga
// tokens + cache localmente independentemente do resultado da revogação
// remota (nunca deixamos token/cache órfão só porque a chamada externa
// falhou — checklist item 97), e marca ConnectedApp como desconectado.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/integrations/token-crypto";
import { revokeStravaAccessToken } from "@/lib/integrations/strava";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connectedApp = await prisma.connectedApp.findUnique({
    where: { userId_provider: { userId, provider: "STRAVA" } },
  });
  if (!connectedApp) {
    return NextResponse.json({ error: "Strava não está conectado" }, { status: 400 });
  }

  let revokeError: string | null = null;
  if (connectedApp.accessTokenEncrypted) {
    try {
      const accessToken = decryptToken(connectedApp.accessTokenEncrypted);
      await revokeStravaAccessToken(accessToken);
    } catch (err) {
      // Não interrompe a desconexão local — token e cache são apagados de
      // qualquer forma. Só reportamos que a revogação remota pode não ter
      // sido concluída, sem nunca vazar o token no erro.
      revokeError = err instanceof Error ? err.message : "Falha ao revogar no Strava";
      console.error("Erro ao revogar token do Strava:", revokeError);
    }
  }

  await prisma.$transaction([
    prisma.connectedApp.update({
      where: { id: connectedApp.id },
      data: {
        status: "DISCONNECTED",
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        expiresAt: null,
        disconnectedAt: new Date(),
        lastError: null,
      },
    }),
    prisma.externalActivityCache.deleteMany({ where: { userId, provider: "STRAVA" } }),
  ]);

  return NextResponse.json({ disconnected: true, remoteRevokeFailed: !!revokeError });
}
