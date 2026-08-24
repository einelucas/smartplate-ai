// app/api/profile/subscription-status/route.ts
// Status de plano/assinatura pro card do Perfil e pra tela /subscribe — só
// os campos relevantes (nunca o Profile inteiro, que tem dados físicos
// privados). Combina Stripe (Profile.subscriptionActive) com PremiumGrant
// (ex.: Beta) através de resolvePremiumAccess, a mesma fonte única de
// verdade usada pelo middleware/check-subscription.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { resolvePremiumAccess } from "@/lib/premium/access";

export async function GET() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [profile, premium] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId: clerkUser.id },
        select: { subscriptionActive: true, subscriptionTier: true },
      }),
      resolvePremiumAccess(clerkUser.id),
    ]);

    return NextResponse.json({
      subscriptionActive: profile?.subscriptionActive ?? false,
      subscriptionTier: profile?.subscriptionTier ?? null,
      premium,
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return NextResponse.json({ error: "Failed to fetch subscription status." }, { status: 500 });
  }
}
