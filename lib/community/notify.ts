// lib/community/notify.ts
// Ponto único de criação de Notification que respeita a preferência de
// categoria do destinatário (SocialProfile.notify*). Nunca criar uma
// Notification diretamente fora daqui para eventos sociais/de progresso —
// senão a tela de configuração (app/community/privacy/page.tsx) mentiria.
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type NotificationCategory =
  | "notifySocial"
  | "notifyMeals"
  | "notifyActivities"
  | "notifyChallenges"
  | "notifyStreak"
  | "notifyProgress"
  | "notifyReminders";

interface NotifyInput {
  type: string;
  title: string;
  body: string;
  data?: Prisma.InputJsonValue;
}

const PREFERENCE_SELECT = {
  notifySocial: true,
  notifyMeals: true,
  notifyActivities: true,
  notifyChallenges: true,
  notifyStreak: true,
  notifyProgress: true,
  notifyReminders: true,
} as const;

export async function notifyIfEnabled(userId: string, category: NotificationCategory, input: NotifyInput): Promise<void> {
  const socialProfile = await prisma.socialProfile.findUnique({ where: { userId }, select: PREFERENCE_SELECT });
  // Sem SocialProfile ainda (nunca visitou a Comunidade) — passa (mesmo default true das colunas).
  if (socialProfile && !socialProfile[category]) return;

  await prisma.notification.create({
    data: { userId, type: input.type, title: input.title, body: input.body, data: input.data },
  });
}
