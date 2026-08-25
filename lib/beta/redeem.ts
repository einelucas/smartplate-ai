// lib/beta/redeem.ts
// Lógica de resgate de código Beta — extraída da rota para poder ser
// chamada diretamente por testes automatizados (concorrência real via
// Promise.all, sem precisar de servidor HTTP nem sessão Clerk real).
// Comportamento idêntico ao anterior em app/api/beta/redeem/route.ts, que
// agora só chama esta função e traduz o resultado em NextResponse.
import { Prisma, type PrismaClient } from "@prisma/client";
import { hashBetaCode, isValidBetaCodeFormat, normalizeBetaCode } from "./codes";

export const BETA_REDEEM_MESSAGES = {
  invalid: "Código Beta inválido.",
  alreadyUsedByOther: "Este código Beta já foi utilizado.",
  inactive: "Este código Beta não está mais disponível.",
  redeemExpired: "O prazo para ativar este código Beta expirou.",
  userAlreadyRedeemed: "Você já utilizou um código de acesso Beta.",
  alreadyPremium: "Sua conta já possui acesso Premium ativo.",
} as const;

export type RedeemBetaCodeOutcome =
  | { ok: true; alreadyRedeemed: boolean; expiresAt: Date | null }
  | { ok: false; status: number; error: string };

class BetaCodeTakenByOtherUserError extends Error {}

export async function redeemBetaCodeForUser(prisma: PrismaClient, userId: string, rawCode: string): Promise<RedeemBetaCodeOutcome> {
  const normalized = normalizeBetaCode(rawCode);
  if (!isValidBetaCodeFormat(normalized)) {
    return { ok: false, status: 400, error: BETA_REDEEM_MESSAGES.invalid };
  }

  const codeHash = hashBetaCode(normalized);

  const betaCode = await prisma.betaCode.findUnique({ where: { codeHash } });
  if (!betaCode) {
    return { ok: false, status: 400, error: BETA_REDEEM_MESSAGES.invalid };
  }

  // Retry legítimo: o próprio usuário já resgatou exatamente este código
  // (ex.: perdeu a resposta por queda de conexão). Idempotente.
  if (betaCode.redeemedByUserId === userId) {
    const existingGrant = await prisma.premiumGrant.findUnique({ where: { sourceRefId: betaCode.id } });
    return { ok: true, alreadyRedeemed: true, expiresAt: existingGrant?.expiresAt ?? null };
  }

  if (betaCode.redeemedByUserId) {
    return { ok: false, status: 409, error: BETA_REDEEM_MESSAGES.alreadyUsedByOther };
  }

  if (!betaCode.isActive) {
    return { ok: false, status: 400, error: BETA_REDEEM_MESSAGES.inactive };
  }

  if (betaCode.redeemUntil && new Date() > betaCode.redeemUntil) {
    return { ok: false, status: 400, error: BETA_REDEEM_MESSAGES.redeemExpired };
  }

  const [alreadyUsedAnotherCode, profile] = await Promise.all([
    prisma.betaCode.findUnique({ where: { redeemedByUserId: userId }, select: { id: true } }),
    prisma.profile.findUnique({ where: { userId }, select: { subscriptionActive: true } }),
  ]);

  if (alreadyUsedAnotherCode) {
    return { ok: false, status: 400, error: BETA_REDEEM_MESSAGES.userAlreadyRedeemed };
  }

  // Não consome o código: usuário já tem Premium via Stripe, não precisa do Beta.
  if (profile?.subscriptionActive) {
    return { ok: false, status: 400, error: BETA_REDEEM_MESSAGES.alreadyPremium };
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

    return { ok: true, alreadyRedeemed: result.alreadyRedeemed, expiresAt: result.expiresAt };
  } catch (error) {
    if (error instanceof BetaCodeTakenByOtherUserError) {
      return { ok: false, status: 409, error: BETA_REDEEM_MESSAGES.alreadyUsedByOther };
    }
    // P2002 no redeemedByUserId (unique): usuário venceu a corrida de OUTRO
    // código em paralelo — proteção de banco do "1 usuário = 1 beta code".
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, status: 400, error: BETA_REDEEM_MESSAGES.userAlreadyRedeemed };
    }
    throw error;
  }
}
