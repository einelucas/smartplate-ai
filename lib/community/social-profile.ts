// lib/community/social-profile.ts
// Cria o SocialProfile automaticamente no primeiro acesso à Comunidade,
// usando nome/avatar do Clerk. Nunca usa e-mail nem dados físicos do Profile.
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { sanitizeUsername } from "./validation";

async function generateUniqueUsername(base: string, userId: string): Promise<string> {
  const sanitizedBase = sanitizeUsername(base) || "usuario";
  let candidate = sanitizedBase;

  for (let attempt = 0; attempt < 8; attempt++) {
    const existing = await prisma.socialProfile.findUnique({
      where: { username: candidate },
      select: { userId: true },
    });
    if (!existing) return candidate;
    const suffix = Math.floor(1000 + Math.random() * 9000);
    candidate = `${sanitizedBase.slice(0, 18)}${suffix}`;
  }

  // Fallback garantido e único: derivado do próprio userId do Clerk.
  return `user_${userId.replace(/[^a-zA-Z0-9]/g, "").slice(-12).toLowerCase()}`;
}

/** Garante que o SocialProfile do usuário exista, criando-o se necessário. */
export async function ensureSocialProfile(userId: string) {
  const existing = await prisma.socialProfile.findUnique({ where: { userId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  const fullName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ").trim();
  const usernameBase =
    clerkUser?.username ||
    fullName ||
    clerkUser?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "usuario";
  const displayName = fullName || clerkUser?.username || "Usuário SmartPlate";
  const username = await generateUniqueUsername(usernameBase, userId);

  try {
    return await prisma.socialProfile.create({
      data: {
        userId,
        username,
        displayName,
        avatarUrl: clerkUser?.imageUrl ?? null,
      },
    });
  } catch (error) {
    // Corrida rara: outra requisição criou o SocialProfile entre o findUnique e o create.
    const raced = await prisma.socialProfile.findUnique({ where: { userId } });
    if (raced) return raced;
    throw error;
  }
}
