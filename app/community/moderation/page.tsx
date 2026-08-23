// app/community/moderation/page.tsx
// Página protegida — apenas MODERATOR/ADMIN. Checagem real no servidor
// (Server Component); as APIs por trás também reforçam a mesma regra.
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import ModerationDashboard from "@/components/social/ModerationDashboard";

export default async function ModerationPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-up");

  const profile = await prisma.profile.findUnique({ where: { userId }, select: { role: true } });
  if (!profile || (profile.role !== "MODERATOR" && profile.role !== "ADMIN")) {
    redirect("/community");
  }

  return <ModerationDashboard />;
}
