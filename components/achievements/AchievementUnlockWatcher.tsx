// components/achievements/AchievementUnlockWatcher.tsx
// Mantém useAchievements() (GET /api/achievements) ativo em toda a árvore
// autenticada, não só quando o usuário está no Perfil — sem isso, invalidar a
// query ["achievements"] de uma tela qualquer (favoritar, trocar refeição,
// concluir desafio) nunca dispara um refetch, porque não existiria nenhum
// observer montado pra reagir. Não renderiza nada visível: só garante que
// newlyUnlocked chegue em queueAchievementUnlocks assim que acontecer, em
// qualquer página.
"use client";

import { useAchievements } from "@/hooks/useAchievements";

export default function AchievementUnlockWatcher() {
  useAchievements();
  return null;
}
