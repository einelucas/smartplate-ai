-- Preferências de notificação por categoria em SocialProfile (aditivo,
-- todas com default true — nenhuma coluna existente é alterada).
ALTER TABLE "SocialProfile" ADD COLUMN "notifySocial" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SocialProfile" ADD COLUMN "notifyMeals" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SocialProfile" ADD COLUMN "notifyActivities" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SocialProfile" ADD COLUMN "notifyChallenges" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SocialProfile" ADD COLUMN "notifyStreak" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SocialProfile" ADD COLUMN "notifyProgress" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SocialProfile" ADD COLUMN "notifyReminders" BOOLEAN NOT NULL DEFAULT true;
