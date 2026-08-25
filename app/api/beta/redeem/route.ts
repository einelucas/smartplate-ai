// app/api/beta/redeem/route.ts
// Resgate de código Beta de uso único → 30 dias (ou o configurado no código)
// de PremiumGrant a partir do momento da ativação. Nunca loga o código puro.
// Lógica real mora em lib/beta/redeem.ts (reutilizada por testes automatizados
// de concorrência) — esta rota só resolve a sessão, valida o corpo e traduz
// o resultado em NextResponse.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redeemBetaCodeSchema } from "@/lib/beta/validation";
import { redeemBetaCodeForUser, BETA_REDEEM_MESSAGES } from "@/lib/beta/redeem";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = redeemBetaCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: BETA_REDEEM_MESSAGES.invalid }, { status: 400 });
  }

  try {
    const result = await redeemBetaCodeForUser(prisma, userId, parsed.data.code);
    // `result.ok === false` (não `!result.ok`): sob strict:false (tsconfig
    // deste projeto), o narrowing de union discriminada via negação/truthy
    // falha silenciosamente sem strictNullChecks — comparação explícita é a
    // única forma confiável aqui (confirmado isolando o caso mínimo em tsc).
    if (result.ok === false) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, alreadyRedeemed: result.alreadyRedeemed, expiresAt: result.expiresAt });
  } catch (error) {
    console.error("Erro ao resgatar código Beta:", error);
    return NextResponse.json({ error: "Erro ao resgatar código Beta" }, { status: 500 });
  }
}
