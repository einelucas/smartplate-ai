// lib/community/challenge-labels.ts
// Rótulos de exibição do ChallengeMetric — extraído de ChallengeCard.tsx pra
// ser reaproveitado também por ChallengePickerModal.tsx e pelo card de post
// CHALLENGE (PostCard.tsx), sem duplicar o mapa em cada lugar.
export const CHALLENGE_METRIC_LABELS: Record<string, string> = {
  ACTIVE_DAYS: "dias ativos",
  MEAL_COMPLETIONS: "refeições concluídas",
  STREAK_DAYS: "dias de streak",
  ACTIVITY_COUNT: "atividades",
  ACTIVITY_MINUTES: "minutos ativos",
  WALKING_DAYS: "dias de caminhada",
  RUNNING_DAYS: "dias de corrida",
  CYCLING_DAYS: "dias de ciclismo",
  STRENGTH_DAYS: "dias de musculação",
  BALANCED_DAYS: "dias equilibrados",
};
