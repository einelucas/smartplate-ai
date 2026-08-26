-- Divide SocialProfile.avatarUrl (fonte única e ambígua, causa raiz do
-- conflito Google x foto personalizada) em duas colunas explícitas:
-- customAvatarUrl (upload feito no SmartPlate) e providerAvatarUrl (foto do
-- provedor OAuth, ex.: Google). Preserva todo dado existente: como nenhum
-- write path anterior conseguia de fato persistir uma foto personalizada
-- (bug confirmado em updateSocialProfileSchema, que descartava o campo),
-- todo valor hoje em avatarUrl é sempre uma foto de provedor — por isso é
-- seguro copiar 1:1 para providerAvatarUrl antes de remover a coluna antiga.

-- AlterTable: adiciona as novas colunas primeiro (aditivo, sem perda de dado)
ALTER TABLE "SocialProfile" ADD COLUMN "customAvatarUrl" TEXT;
ALTER TABLE "SocialProfile" ADD COLUMN "providerAvatarUrl" TEXT;

-- Backfill: copia o valor existente para a coluna correta antes de remover a antiga
UPDATE "SocialProfile" SET "providerAvatarUrl" = "avatarUrl" WHERE "avatarUrl" IS NOT NULL;

-- Remove a coluna antiga só depois do backfill acima
ALTER TABLE "SocialProfile" DROP COLUMN "avatarUrl";
