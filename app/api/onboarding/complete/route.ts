// app/api/onboarding/complete/route.ts
// Finaliza o onboarding em uma única operação: identidade (SocialProfile),
// dados físicos + objetivo (Profile), preferências (UserPreferences) e o
// primeiro registro de peso (WeightLog). Idempotente: se o onboarding já
// tiver sido concluído, não repete a escrita nem duplica o WeightLog inicial
// (protege contra retry/duplo submit).
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureSocialProfile } from "@/lib/community/social-profile";
import { completeOnboardingSchema, isReservedUsername } from "@/lib/profile/validation";

const ONBOARDING_VERSION = 1;

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = completeOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  if (isReservedUsername(data.username)) {
    return NextResponse.json({ error: "Este nome de usuário não está disponível" }, { status: 400 });
  }

  // Fast-path: evita abrir transação para o caso comum (onboarding já
  // concluído há tempo). A garantia real contra concorrência está no "claim"
  // atômico dentro da transação abaixo, não nesta checagem.
  const currentProfile = await prisma.profile.findUnique({
    where: { userId },
    select: { onboardingCompletedAt: true },
  });
  if (currentProfile?.onboardingCompletedAt) {
    return NextResponse.json({ success: true, alreadyCompleted: true });
  }

  // Garante o SocialProfile antes da transação (ensureSocialProfile usa o
  // client global do Prisma, não pode ser chamado dentro do $transaction).
  await ensureSocialProfile(userId);

  const existingUsername = await prisma.socialProfile.findUnique({
    where: { username: data.username },
    select: { userId: true },
  });
  if (existingUsername && existingUsername.userId !== userId) {
    return NextResponse.json({ error: "Nome de usuário já em uso" }, { status: 409 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.profile.findUnique({ where: { userId }, select: { startWeight: true } });

      // "Claim" atômico: só quem conseguir mudar onboardingCompletedAt de
      // null para uma data prossegue. Sob duplo clique/retry concorrentes, o
      // Postgres serializa os dois UPDATEs — o segundo reavalia o WHERE após
      // o primeiro commitar, não casa mais (já não é null) e count fica 0.
      // Isso impede WeightLog duplicado e qualquer escrita parcial dupla.
      const claim = await tx.profile.updateMany({
        where: { userId, onboardingCompletedAt: null },
        data: {
          height: data.height,
          currentWeight: data.currentWeight,
          targetWeight: data.targetWeight,
          startWeight: before?.startWeight ?? data.currentWeight,
          dietType: data.dietType,
          cookingLevel: data.cookingLevel,
          birthDate: data.birthDate,
          activityLevel: data.activityLevel,
          onboardingCompletedAt: new Date(),
          onboardingVersion: ONBOARDING_VERSION,
        },
      });

      if (claim.count === 0) {
        return { alreadyCompleted: true };
      }

      await tx.socialProfile.update({
        where: { userId },
        data: {
          displayName: data.displayName,
          username: data.username,
          bio: data.bio ?? null,
          ...(data.timezone ? { timezone: data.timezone } : {}),
        },
      });

      await tx.userPreferences.upsert({
        where: { userId },
        update: {
          dietGoal: data.dietGoal,
          allergies: data.allergies,
          preferredFoods: data.preferredFoods,
          dislikedFoods: data.dislikedFoods,
          maxPrepTime: data.maxPrepTime ?? null,
          budgetLevel: data.budgetLevel,
          additionalNotes: data.additionalNotes ?? null,
        },
        create: {
          userId,
          dietGoal: data.dietGoal,
          allergies: data.allergies,
          preferredFoods: data.preferredFoods,
          dislikedFoods: data.dislikedFoods,
          maxPrepTime: data.maxPrepTime ?? null,
          budgetLevel: data.budgetLevel,
          additionalNotes: data.additionalNotes ?? null,
        },
      });

      await tx.weightLog.create({
        data: { userId, weight: data.currentWeight, date: new Date() },
      });

      return { alreadyCompleted: false };
    });

    return NextResponse.json({ success: true, alreadyCompleted: result.alreadyCompleted });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Nome de usuário já em uso" }, { status: 409 });
    }
    console.error("Erro ao concluir onboarding:", error);
    return NextResponse.json({ error: "Erro ao concluir onboarding" }, { status: 500 });
  }
}
