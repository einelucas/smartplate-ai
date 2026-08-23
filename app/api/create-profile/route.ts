// app/api/create-profile/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { ensureSocialProfile } from "@/lib/community/social-profile";

export async function POST() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser)
      return NextResponse.json({ error: "User not found in Clerk." }, { status: 404 });

    const email = clerkUser.emailAddresses?.[0]?.emailAddress;
    if (!email)
      return NextResponse.json({ error: "User does not have an email address." }, { status: 400 });

    const existing = await prisma.profile.findUnique({ where: { userId: clerkUser.id } });
    if (!existing) {
      await prisma.profile.create({
        data: {
          userId: clerkUser.id,
          email,
          subscriptionActive: false,
          subscriptionTier: null,
          stripeSubscriptionId: null,
        },
      });
    }

    // Garante a identidade pública (SocialProfile) já na inicialização da
    // conta, não apenas no primeiro acesso à Comunidade.
    await ensureSocialProfile(clerkUser.id);

    return NextResponse.json(
      { message: existing ? "Profile already exists." : "Profile created successfully." },
      { status: existing ? 200 : 201 }
    );
  } catch (error) {
    console.error("Error in create-profile:", error);
    return NextResponse.json({ error: "Internal Server Error." }, { status: 500 });
  }
}
