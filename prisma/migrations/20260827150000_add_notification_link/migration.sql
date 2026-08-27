-- Adiciona rota relativa opcional pra navegação ao clicar numa notificação
-- (checklist seção 26). Nullable e aditiva: notificações existentes ficam
-- com link = NULL, sem quebrar nada.
ALTER TABLE "Notification" ADD COLUMN "link" TEXT;
