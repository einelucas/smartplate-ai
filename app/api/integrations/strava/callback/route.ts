// app/api/integrations/strava/callback/route.ts
// Passo 2 do OAuth: valida `state` (CSRF), troca o code por tokens,
// criptografa e persiste em ConnectedApp. Sempre redireciona de volta para a
// tela de Apps conectados (sucesso ou erro), nunca devolve token no corpo.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeStravaAuthorizationCode, isStravaConfigured, packStravaTokenResponse, STRAVA_SCOPES } from "@/lib/integrations/strava";

const STATE_COOKIE = "strava_oauth_state";
const RETURN_PATH = "/profile/connected-apps";

function redirectWithStatus(origin: string, status: "connected" | "error", message?: string) {
  const url = new URL(RETURN_PATH, origin);
  url.searchParams.set("strava", status);
  if (message) url.searchParams.set("message", message);
  const response = NextResponse.redirect(url);
  response.cookies.delete(STATE_COOKIE);
  return response;
}

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL("/sign-in", origin));

  if (!isStravaConfigured()) {
    return redirectWithStatus(origin, "error", "not_configured");
  }

  const error = searchParams.get("error");
  if (error) {
    // Usuário negou o consentimento no Strava — não é uma falha do sistema.
    return redirectWithStatus(origin, "error", "denied");
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = request.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))
    ?.split("=")[1];

  if (!code || !state || !cookieState || state !== cookieState) {
    return redirectWithStatus(origin, "error", "invalid_state");
  }

  try {
    const tokens = await exchangeStravaAuthorizationCode(code);
    const packed = packStravaTokenResponse(tokens);

    await prisma.connectedApp.upsert({
      where: { userId_provider: { userId, provider: "STRAVA" } },
      create: {
        userId,
        provider: "STRAVA",
        status: "CONNECTED",
        scopes: (packed.scope ?? STRAVA_SCOPES).split(","),
        providerUserId: packed.athleteId ? String(packed.athleteId) : null,
        accessTokenEncrypted: packed.accessTokenEncrypted,
        refreshTokenEncrypted: packed.refreshTokenEncrypted,
        expiresAt: packed.expiresAt,
      },
      update: {
        status: "CONNECTED",
        scopes: (packed.scope ?? STRAVA_SCOPES).split(","),
        providerUserId: packed.athleteId ? String(packed.athleteId) : null,
        accessTokenEncrypted: packed.accessTokenEncrypted,
        refreshTokenEncrypted: packed.refreshTokenEncrypted,
        expiresAt: packed.expiresAt,
        disconnectedAt: null,
        lastError: null,
      },
    });

    return redirectWithStatus(origin, "connected");
  } catch (err) {
    console.error("Erro ao conectar Strava:", err);
    return redirectWithStatus(origin, "error", "exchange_failed");
  }
}
