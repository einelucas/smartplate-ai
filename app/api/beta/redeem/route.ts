// app/api/beta/redeem/route.ts
// Resgate de código Beta de uso único → 30 dias (ou o configurado no código)
// de PremiumGrant a partir do momento da ativação. Nunca loga o código puro.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { redeemBetaCodeSchema } from "@/lib/beta/validation";
import { hashBetaCode, isValidBetaCodeFormat, normalizeBetaCode } from "@/lib/beta/codes";

const MSG_INVALID = "Código Beta inválido.";
const MSG_ALREADY_USED_BY_OTHER = "Este código Beta já foi utilizado.";
const MSG_INACTIVE = "Este código Beta não está mais disponível.";
const MSG_REDEEM_EXPIRED = "O prazo para ativar este código Beta expirou.";
const MSG_USER_ALREADY_REDEEMED = "Você já utilizou um código de acesso Beta.";
const MSG_ALREADY_PREMIUM = "Sua conta já possui acesso Premium ativo.";

class BetaCodeTakenByOtherUserError extends Error {}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = redeemBetaCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: MSG_INVALID }, { status: 400 });
  }

  const normalized = normalizeBetaCode(parsed.data.code);
  if (!isValidBetaCodeFormat(normalized)) {
    return NextResponse.json({ error: MSG_INVALID }, { status: 400 });
  }

  const codeHash = hashBetaCode(normalized);

  const betaCode = await prisma.betaCode.findUnique({ where: { codeHash } });
  if (!betaCode) {
    return NextResponse.json({ error: MSG_INVALID }, { status: 400 });
  }

  // Retry legítimo: o próprio usuário já resgatou exatamente este código
  // (ex.: perdeu a resposta por queda de conexão). Idempotente.
  if (betaCode.redeemedByUserId === userId) {
    const existingGrant = await prisma.premiumGrant.findUnique({ where: { sourceRefId: betaCode.id } });
    return NextResponse.json({
      success: true,
      alreadyRedeemed: true,
      expiresAt: existingGrant?.expiresAt ?? null,
    });
  }

  if (betaCode.redeemedByUserId) {
    return NextResponse.json({ error: MSG_ALREADY_USED_BY_OTHER }, { status: 409 });
  }

  if (!betaCode.isActive) {
    return NextResponse.json({ error: MSG_INACTIVE }, { status: 400 });
  }

  if (betaCode.redeemUntil && new Date() > betaCode.redeemUntil) {
    return NextResponse.json({ error: MSG_REDEEM_EXPIRED }, { status: 400 });
  }

  const [alreadyUsedAnotherCode, profile] = await Promise.all([
    prisma.betaCode.findUnique({ where: { redeemedByUserId: userId }, select: { id: true } }),
    prisma.profile.findUnique({ where: { userId }, select: { subscriptionActive: true } }),
  ]);

  if (alreadyUsedAnotherCode) {
    return NextResponse.json({ error: MSG_USER_ALREADY_REDEEMED }, { status: 400 });
  }

  // Não consome o código: usuário já tem Premium via Stripe, não precisa do Beta.
  if (profile?.subscriptionActive) {
    return NextResponse.json({ error: MSG_ALREADY_PREMIUM }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // "Claim" atômico: só quem conseguir tirar redeemedByUserId de null
      // prossegue. Sob concorrência, o Postgres serializa os UPDATEs — o
      // perdedor reavalia o WHERE após o vencedor commitar e count fica 0.
      const claim = await tx.betaCode.updateMany({
        where: { id: betaCode.id, redeemedByUserId: null },
        data: { redeemedByUserId: userId, redeemedAt: now },
      });

      if (claim.count === 0) {
        const fresh = await tx.betaCode.findUnique({ where: { id: betaCode.id }, select: { redeemedByUserId: true } });
        if (fresh?.redeemedByUserId === userId) {
          const existingGrant = await tx.premiumGrant.findUnique({ where: { sourceRefId: betaCode.id } });
          return { alreadyRedeemed: true, expiresAt: existingGrant?.expiresAt ?? null };
        }
        throw new BetaCodeTakenByOtherUserError();
      }

      const expiresAt = new Date(now.getTime() + betaCode.durationDays * 24 * 60 * 60 * 1000);
      const grant = await tx.premiumGrant.create({
        data: {
          userId,
          source: "BETA_CODE",
          startsAt: now,
          expiresAt,
          sourceRefId: betaCode.id,
        },
      });

      return { alreadyRedeemed: false, expiresAt: grant.expiresAt };
    });

    return NextResponse.json({ success: true, alreadyRedeemed: result.alreadyRedeemed, expiresAt: result.expiresAt });
  } catch (error) {
    if (error instanceof BetaCodeTakenByOtherUserError) {
      return NextResponse.json({ error: MSG_ALREADY_USED_BY_OTHER }, { status: 409 });
    }
    // P2002 no redeemedByUserId (unique): usuário venceu a corrida de OUTRO
    // código em paralelo — proteção de banco do "1 usuário = 1 beta code".
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: MSG_USER_ALREADY_REDEEMED }, { status: 400 });
    }
    console.error("Erro ao resgatar código Beta:", error);
    return NextResponse.json({ error: "Erro ao resgatar código Beta" }, { status: 500 });
  }
}
