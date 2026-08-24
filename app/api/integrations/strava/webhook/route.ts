// app/api/integrations/strava/webhook/route.ts
// Endpoint público (o Strava chama sem sessão Clerk — checklist item 93).
// GET = validação da subscription (protocolo oficial, hub.challenge). POST =
// eventos (create/update/delete de atividade, ou revogação de autorização).
// NUNCA vira uma API pública genérica: só aceita a estrutura exata do
// protocolo e sempre valida STRAVA_WEBHOOK_VERIFY_TOKEN antes de qualquer
// ação — nunca hardcoded (checklist item 86).
//
// IMPORTANTE: registrar a subscription em si (POST para
// api.strava.com/v3/push_subscriptions com callback_url pública) exige um
// domínio de produção acessível pelo Strava — não é possível fazer isso a
// partir deste ambiente local. O endpoint abaixo está pronto para responder
// corretamente quando a subscription for criada, mas isso ainda não foi
// validado contra o Strava real (ver scripts/register-strava-webhook.cjs e
// o relatório final desta tarefa).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/integrations/token-crypto";
import { fetchStravaActivityById, normalizeStravaActivity } from "@/lib/integrations/strava";
import { EXTERNAL_ACTIVITY_CACHE_MAX_DAYS } from "@/lib/integrations/provider-policy";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = searchParams.get("hub.verify_token");

  const expectedToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;
  if (!expectedToken || mode !== "subscribe" || !challenge || verifyToken !== expectedToken) {
    return NextResponse.json({ error: "Verificação inválida" }, { status: 403 });
  }

  return NextResponse.json({ "hub.challenge": challenge });
}

interface StravaWebhookEvent {
  aspect_type: "create" | "update" | "delete";
  event_time: number;
  object_id: number;
  object_type: "activity" | "athlete";
  owner_id: number;
  subscription_id: number;
  updates?: Record<string, string>;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as StravaWebhookEvent | null;
  if (!body || !body.object_type || !body.aspect_type || !body.owner_id) {
    // Corpo fora do protocolo — nunca processar, mas ainda responder 200
    // rápido (o Strava reenvia em caso de erro; corpo malformado não é algo
    // para tentar de novo).
    return NextResponse.json({ received: true });
  }

  const connectedApp = await prisma.connectedApp.findFirst({
    where: { provider: "STRAVA", providerUserId: String(body.owner_id), status: "CONNECTED" },
  });
  if (!connectedApp) {
    // Athlete não conectado ao SmartPlate (ou já desconectou) — nada a fazer.
    return NextResponse.json({ received: true });
  }

  try {
    if (body.object_type === "athlete") {
      // Revogação do lado do Strava — updates.authorized === "false".
      if (body.updates?.authorized === "false") {
        await prisma.$transaction([
          prisma.connectedApp.update({
            where: { id: connectedApp.id },
            data: {
              status: "DISCONNECTED",
              accessTokenEncrypted: null,
              refreshTokenEncrypted: null,
              expiresAt: null,
              disconnectedAt: new Date(),
            },
          }),
          prisma.externalActivityCache.deleteMany({ where: { userId: connectedApp.userId, provider: "STRAVA" } }),
        ]);
      }
      return NextResponse.json({ received: true });
    }

    // object_type === "activity"
    const externalId = String(body.object_id);

    if (body.aspect_type === "delete") {
      await prisma.externalActivityCache.deleteMany({
        where: { userId: connectedApp.userId, provider: "STRAVA", externalId },
      });
      return NextResponse.json({ received: true });
    }

    // create/update: o webhook só manda o ID — busca o recurso completo
    // usando o token do PRÓPRIO dono (item 88).
    if (!connectedApp.accessTokenEncrypted) return NextResponse.json({ received: true });
    const accessToken = decryptToken(connectedApp.accessTokenEncrypted);
    const raw = await fetchStravaActivityById(accessToken, externalId);
    const normalized = normalizeStravaActivity(raw);
    const expiresAt = new Date(Date.now() + EXTERNAL_ACTIVITY_CACHE_MAX_DAYS * 24 * 60 * 60 * 1000);

    await prisma.externalActivityCache.upsert({
      where: { userId_provider_externalId: { userId: connectedApp.userId, provider: "STRAVA", externalId } },
      create: {
        userId: connectedApp.userId,
        provider: "STRAVA",
        externalId,
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
        cachedAt: new Date(),
        expiresAt,
      },
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    // Sempre 200 — o protocolo do Strava não espera retry em erro de
    // processamento nosso, só loga para investigação.
    console.error("Erro ao processar webhook do Strava:", err);
    return NextResponse.json({ received: true });
  }
}
