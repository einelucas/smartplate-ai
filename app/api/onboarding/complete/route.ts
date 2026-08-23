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

  const currentProfile = await prisma.profile.findUnique({
    where: { userId },
    select: { onboardingCompletedAt: true, startWeight: true },
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
    await prisma.$transaction(async (tx) => {
      await tx.socialProfile.update({
        where: { userId },
        data: {
          displayName: data.displayName,
          username: data.username,
          bio: data.bio ?? null,
          ...(data.timezone ? { timezone: data.timezone } : {}),
        },
      });

      await tx.profile.update({
        where: { userId },
        data: {
          height: data.height,
          currentWeight: data.currentWeight,
          targetWeight: data.targetWeight,
          startWeight: currentProfile?.startWeight ?? data.currentWeight,
          dietType: data.dietType,
          cookingLevel: data.cookingLevel,
          onboardingCompletedAt: new Date(),
          onboardingVersion: ONBOARDING_VERSION,
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
    });

    return NextResponse.json({ success: true, alreadyCompleted: false });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Nome de usuário já em uso" }, { status: 409 });
    }
    console.error("Erro ao concluir onboarding:", error);
    return NextResponse.json({ error: "Erro ao concluir onboarding" }, { status: 500 });
  }
}
