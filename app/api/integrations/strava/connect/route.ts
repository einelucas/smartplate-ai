// app/api/integrations/strava/connect/route.ts
// Passo 1 do OAuth: gera um `state` aleatório (proteção CSRF — checklist
// item 67), guarda em cookie httpOnly de curta duração e redireciona para o
// consentimento oficial do Strava. Nunca confia só no userId da query.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { buildStravaAuthorizeUrl, isStravaConfigured } from "@/lib/integrations/strava";

const STATE_COOKIE = "strava_oauth_state";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isStravaConfigured()) {
    return NextResponse.json({ error: "Integração com o Strava ainda não está configurada" }, { status: 503 });
  }

  const state = crypto.randomBytes(32).toString("hex");
  const authorizeUrl = buildStravaAuthorizeUrl(state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60, // 10 minutos — só precisa sobreviver ao round-trip do consentimento
  });
  return response;
}
