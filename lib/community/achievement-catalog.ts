// lib/community/achievement-catalog.ts
// Catálogo central das 50 conquistas (fonte: SMARTPLATE_FUTURE_FEATURES_
// CHECKLIST_CONQUISTAS.md, seções 49-61). Código é o ID estável em banco
// (UserAchievement.achievementCode); título/descrição podem mudar livremente
// sem quebrar nada. `availability: "COMING_SOON"` marca conquistas cujo
// módulo de dados ainda não existe (streak definitivo, favoritos/troca
// ambíguos) — nunca avaliadas nem desbloqueadas enquanto assim estiverem.
//
// Este é um catálogo NOVO e complementar ao de lib/community/achievements.ts
// (motor antigo de FIRST_ACTION/STREAK_*/XP_*/FIRST_CHALLENGE/FIRST_GROUP,
// usado por checkAndUnlockAchievements em recordMealCompletion/
// recordChallengeCompletion/groups). Esse motor antigo continua intacto e
// funcionando exatamente como antes. Este catálogo novo é quem alimenta a
// tela "Todas as conquistas" — ambos gravam na mesma tabela UserAchievement,
// mas nenhum código deste catálogo depende do motor antigo, EXCETO
// FIRST_GROUP, que reaproveita o desbloqueio real já existente em
// app/api/community/groups/route.ts (mesmo código, mesma linha do banco).
//
// IMPORTANTE — STREAK_*: o motor antigo já concede STREAK_3/7/14/30 a partir
// do streak provisório (recordMealCompletion). O checklist é explícito:
// "não desbloquear com o streak antigo se ele ainda estiver baseado em regra
// provisória" (seção 26) — a regra definitiva de "dia ativo" ainda não foi
// formalizada (seção 41 do roadmap, todos os itens `[ ]`). Por isso todos os
// STREAK_* aqui são COMING_SOON, mesmo que uma UserAchievement antiga já
// exista para eles: o avaliador (achievement-engine.ts) nunca consulta nem
// exibe status UNLOCKED para um código COMING_SOON, independente do banco.

export type AchievementCategory =
  | "ONBOARDING"
  | "FOOD"
  | "HYDRATION"
  | "STREAK"
  | "PROGRESS"
  | "ACTIVITY"
  | "SOCIAL"
  | "CHALLENGE"
  | "SPECIAL";

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  ONBOARDING: "Primeiros passos",
  FOOD: "Alimentação",
  HYDRATION: "Hidratação",
  STREAK: "Sequência",
  PROGRESS: "Progresso",
  ACTIVITY: "Atividade",
  SOCIAL: "Social",
  CHALLENGE: "Desafios",
  SPECIAL: "Especiais",
};

export type AchievementAvailability = "AVAILABLE" | "COMING_SOON";

// Raridade decide o XP concedido no desbloqueio (ver ACHIEVEMENT_RARITY_XP)
// — nunca hardcoded em componente algum. Campo opcional: entradas sem
// `rarity` explícita usam COMMON (a maioria das 57 conquistas do catálogo
// são marcos comuns, não precisam de tagueamento individual).
export type AchievementRarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "SPECIAL";

export const ACHIEVEMENT_RARITY_XP: Record<AchievementRarity, number> = {
  COMMON: 10,
  UNCOMMON: 20,
  RARE: 40,
  EPIC: 75,
  SPECIAL: 100,
};

export interface AchievementDefinition {
  code: string;
  title: string;
  description: string;
  unlockDescription: string;
  category: AchievementCategory;
  /** Chave em components/icon-registry.tsx — nunca emoji nem componente (precisa ser serializável em JSON). */
  icon: string;
  target: number;
  availability: AchievementAvailability;
  /** Só relevante quando availability = COMING_SOON — texto exibido no lugar do progresso. */
  comingSoonReason?: string;
  /** Ausente = COMMON. Ver ACHIEVEMENT_RARITY_XP para o XP concedido em cada nível. */
  rarity?: AchievementRarity;
}

export function getAchievementRarity(definition: Pick<AchievementDefinition, "rarity">): AchievementRarity {
  return definition.rarity ?? "COMMON";
}

const STREAK_REASON = "Disponível quando a regra definitiva de sequência (dia ativo) for formalizada.";

function def(entry: AchievementDefinition): AchievementDefinition {
  return entry;
}

export const ACHIEVEMENT_CATALOG: Record<string, AchievementDefinition> = {
  // ── Primeiros passos ──────────────────────────────────────────────────
  WELCOME: def({
    code: "WELCOME",
    title: "Bem-vindo ao SmartPlate",
    description: "Completou seu onboarding.",
    unlockDescription: "Finalize as etapas obrigatórias do onboarding.",
    category: "ONBOARDING",
    icon: "HandWaving",
    target: 1,
    availability: "AVAILABLE",
  }),
  BETA_TESTER: def({
    code: "BETA_TESTER",
    title: "Beta Tester",
    description: "Participou da fase Beta do SmartPlate.",
    unlockDescription: "Ative um código Beta válido.",
    category: "ONBOARDING",
    icon: "Flask",
    target: 1,
    availability: "AVAILABLE",
    rarity: "SPECIAL",
  }),
  PROFILE_COMPLETE: def({
    code: "PROFILE_COMPLETE",
    title: "Identidade Completa",
    description: "Deixou seu perfil completo.",
    unlockDescription: "Tenha nome, username, avatar e bio preenchidos.",
    category: "ONBOARDING",
    icon: "IdentificationCard",
    target: 1,
    availability: "AVAILABLE",
  }),
  GOAL_DEFINED: def({
    code: "GOAL_DEFINED",
    title: "Objetivo Definido",
    description: "Definiu um objetivo pessoal no SmartPlate.",
    unlockDescription: "Preencha seu objetivo no Perfil.",
    category: "ONBOARDING",
    icon: "Target",
    target: 1,
    availability: "AVAILABLE",
  }),
  READY_TO_START: def({
    code: "READY_TO_START",
    title: "Pronto para Começar",
    description: "Configurou os principais dados para usar o SmartPlate.",
    unlockDescription: "Complete onboarding, objetivo e preferências alimentares.",
    category: "ONBOARDING",
    icon: "Compass",
    target: 1,
    availability: "AVAILABLE",
  }),

  // ── Alimentação ────────────────────────────────────────────────────────
  FIRST_MEAL: def({
    code: "FIRST_MEAL",
    title: "Primeiro Prato",
    description: "Concluiu sua primeira refeição planejada.",
    unlockDescription: "Marque uma refeição do plano como concluída.",
    category: "FOOD",
    icon: "BowlFood",
    target: 1,
    availability: "AVAILABLE",
  }),
  FULL_MEAL_DAY: def({
    code: "FULL_MEAL_DAY",
    title: "Dia Completo",
    description: "Completou todas as refeições planejadas de um dia.",
    unlockDescription: "Conclua 100% das refeições planejadas para o mesmo dia.",
    category: "FOOD",
    icon: "ForkKnife",
    target: 1,
    availability: "AVAILABLE",
  }),
  FIRST_BREAKFAST: def({
    code: "FIRST_BREAKFAST",
    title: "Bom Dia",
    description: "Concluiu seu primeiro café da manhã.",
    unlockDescription: "Marque um café da manhã planejado como concluído.",
    category: "FOOD",
    icon: "SunHorizon",
    target: 1,
    availability: "AVAILABLE",
  }),
  FIRST_LUNCH: def({
    code: "FIRST_LUNCH",
    title: "Hora do Almoço",
    description: "Concluiu seu primeiro almoço.",
    unlockDescription: "Marque um almoço planejado como concluído.",
    category: "FOOD",
    icon: "Sun",
    target: 1,
    availability: "AVAILABLE",
  }),
  FIRST_DINNER: def({
    code: "FIRST_DINNER",
    title: "Fechando o Dia",
    description: "Concluiu seu primeiro jantar.",
    unlockDescription: "Marque um jantar planejado como concluído.",
    category: "FOOD",
    icon: "MoonStars",
    target: 1,
    availability: "AVAILABLE",
  }),
  MEALS_10: def({
    code: "MEALS_10",
    title: "10 Refeições",
    description: "Completou 10 refeições planejadas.",
    unlockDescription: "Complete 10 refeições planejadas.",
    category: "FOOD",
    icon: "CheckCircle",
    target: 10,
    availability: "AVAILABLE",
  }),
  MEALS_50: def({
    code: "MEALS_50",
    title: "50 Refeições",
    description: "Completou 50 refeições planejadas.",
    unlockDescription: "Complete 50 refeições planejadas.",
    category: "FOOD",
    icon: "SealCheck",
    target: 50,
    availability: "AVAILABLE",
  }),
  MEALS_100: def({
    code: "MEALS_100",
    rarity: "RARE",
    title: "100 Refeições",
    description: "Completou 100 refeições planejadas.",
    unlockDescription: "Complete 100 refeições planejadas.",
    category: "FOOD",
    icon: "Medal",
    target: 100,
    availability: "AVAILABLE",
  }),
  FIRST_FAVORITE: def({
    code: "FIRST_FAVORITE",
    title: "Favorito",
    description: "Salvou seu primeiro favorito.",
    unlockDescription: "Favorite sua primeira refeição/plano quando o sistema definitivo de favoritos estiver validado.",
    category: "FOOD",
    icon: "Star",
    target: 1,
    availability: "COMING_SOON",
    comingSoonReason: "Disponível quando o sistema de favoritos (plano x refeição) for definido no Plano Semanal.",
  }),
  FIRST_MEAL_SWAP: def({
    code: "FIRST_MEAL_SWAP",
    title: "Experimentando Algo Novo",
    description: "Personalizou seu plano.",
    unlockDescription: "Faça sua primeira troca real de refeição.",
    category: "FOOD",
    icon: "ArrowsClockwise",
    target: 1,
    availability: "COMING_SOON",
    comingSoonReason: "Disponível quando a troca de refeição passar a registrar histórico persistente.",
  }),

  // ── Hidratação ─────────────────────────────────────────────────────────
  FIRST_WATER_LOG: def({
    code: "FIRST_WATER_LOG",
    title: "Primeiro Gole",
    description: "Registrou seu primeiro consumo de água.",
    unlockDescription: "Registre seu primeiro consumo de água.",
    category: "HYDRATION",
    icon: "Drop",
    target: 1,
    availability: "AVAILABLE",
  }),
  FIRST_WATER_GOAL: def({
    code: "FIRST_WATER_GOAL",
    title: "Meta Alcançada",
    description: "Alcançou 100% da meta diária de hidratação.",
    unlockDescription: "Alcance 100% da sua meta diária de hidratação.",
    category: "HYDRATION",
    icon: "Drop",
    target: 1,
    availability: "AVAILABLE",
  }),
  WATER_GOAL_3_DAYS: def({
    code: "WATER_GOAL_3_DAYS",
    title: "3 Dias Hidratado",
    description: "Atingiu a meta diária de água em 3 dias diferentes.",
    unlockDescription: "Atinja a meta diária de água em 3 dias diferentes.",
    category: "HYDRATION",
    icon: "Drop",
    target: 3,
    availability: "AVAILABLE",
  }),
  WATER_GOAL_7_DAYS: def({
    code: "WATER_GOAL_7_DAYS",
    title: "7 Dias Hidratado",
    description: "Atingiu a meta diária em 7 dias diferentes.",
    unlockDescription: "Atinja a meta diária em 7 dias diferentes.",
    category: "HYDRATION",
    icon: "Drop",
    target: 7,
    availability: "AVAILABLE",
  }),
  WATER_GOAL_30_DAYS: def({
    code: "WATER_GOAL_30_DAYS",
    rarity: "RARE",
    title: "30 Dias Hidratado",
    description: "Atingiu a meta diária em 30 dias diferentes.",
    unlockDescription: "Atinja a meta diária em 30 dias diferentes.",
    category: "HYDRATION",
    icon: "Waves",
    target: 30,
    availability: "AVAILABLE",
  }),
  WATER_LOGS_50: def({
    code: "WATER_LOGS_50",
    title: "50 Registros",
    description: "Fez 50 registros válidos de consumo de água.",
    unlockDescription: "Faça 50 registros válidos de consumo de água.",
    category: "HYDRATION",
    icon: "Drop",
    target: 50,
    availability: "AVAILABLE",
  }),
  WATER_WEEK_CONSISTENCY: def({
    code: "WATER_WEEK_CONSISTENCY",
    title: "Hidratação Frequente",
    description: "Registrou consumo de água em 7 dias diferentes.",
    unlockDescription: "Registre consumo de água em 7 dias diferentes.",
    category: "HYDRATION",
    icon: "Drop",
    target: 7,
    availability: "AVAILABLE",
  }),

  // ── Sequência / Streak ─────────────────────────────────────────────────
  STREAK_3: def({
    code: "STREAK_3",
    title: "Começou a Sequência",
    description: "Alcançou uma sequência de 3 dias ativos.",
    unlockDescription: "Alcance uma sequência de 3 dias ativos.",
    category: "STREAK",
    icon: "Fire",
    target: 3,
    availability: "COMING_SOON",
    comingSoonReason: STREAK_REASON,
  }),
  STREAK_7: def({
    code: "STREAK_7",
    title: "Uma Semana",
    description: "Alcançou 7 dias consecutivos ativos.",
    unlockDescription: "Alcance 7 dias consecutivos ativos.",
    category: "STREAK",
    icon: "Fire",
    target: 7,
    availability: "COMING_SOON",
    comingSoonReason: STREAK_REASON,
  }),
  STREAK_14: def({
    code: "STREAK_14",
    title: "Duas Semanas",
    description: "Alcançou 14 dias consecutivos ativos.",
    unlockDescription: "Alcance 14 dias consecutivos ativos.",
    category: "STREAK",
    icon: "Fire",
    target: 14,
    availability: "COMING_SOON",
    comingSoonReason: STREAK_REASON,
  }),
  STREAK_30: def({
    code: "STREAK_30",
    rarity: "UNCOMMON",
    title: "Um Mês",
    description: "Alcançou 30 dias consecutivos ativos.",
    unlockDescription: "Alcance 30 dias consecutivos ativos.",
    category: "STREAK",
    icon: "Fire",
    target: 30,
    availability: "COMING_SOON",
    comingSoonReason: STREAK_REASON,
  }),
  STREAK_60: def({
    code: "STREAK_60",
    rarity: "RARE",
    title: "60 Dias",
    description: "Alcançou 60 dias consecutivos ativos.",
    unlockDescription: "Alcance 60 dias consecutivos ativos.",
    category: "STREAK",
    icon: "Fire",
    target: 60,
    availability: "COMING_SOON",
    comingSoonReason: STREAK_REASON,
  }),
  STREAK_100: def({
    code: "STREAK_100",
    rarity: "EPIC",
    title: "100 Dias",
    description: "Alcançou 100 dias consecutivos ativos.",
    unlockDescription: "Alcance 100 dias consecutivos ativos.",
    category: "STREAK",
    icon: "Fire",
    target: 100,
    availability: "COMING_SOON",
    comingSoonReason: STREAK_REASON,
  }),
  STREAK_365: def({
    code: "STREAK_365",
    rarity: "SPECIAL",
    title: "Imparável",
    description: "Alcançou 365 dias consecutivos ativos.",
    unlockDescription: "Alcance 365 dias consecutivos ativos.",
    category: "STREAK",
    icon: "Trophy",
    target: 365,
    availability: "COMING_SOON",
    comingSoonReason: STREAK_REASON,
  }),

  // ── Progresso ──────────────────────────────────────────────────────────
  FIRST_WEIGHT_LOG: def({
    code: "FIRST_WEIGHT_LOG",
    title: "Primeiro Registro",
    description: "Registrou o peso pela primeira vez.",
    unlockDescription: "Registre seu peso pela primeira vez.",
    category: "PROGRESS",
    icon: "Scales",
    target: 1,
    availability: "AVAILABLE",
  }),
  WEIGHT_LOGS_10: def({
    code: "WEIGHT_LOGS_10",
    title: "Acompanhando a Jornada",
    description: "Fez 10 registros válidos de peso.",
    unlockDescription: "Faça 10 registros válidos de peso.",
    category: "PROGRESS",
    icon: "ChartBar",
    target: 10,
    availability: "AVAILABLE",
  }),
  WEIGHT_LOGS_25: def({
    code: "WEIGHT_LOGS_25",
    rarity: "UNCOMMON",
    title: "Histórico em Construção",
    description: "Fez 25 registros válidos de peso.",
    unlockDescription: "Faça 25 registros válidos de peso.",
    category: "PROGRESS",
    icon: "ChartLineUp",
    target: 25,
    availability: "AVAILABLE",
  }),
  FIRST_PROGRESS_PHOTO: def({
    code: "FIRST_PROGRESS_PHOTO",
    title: "Primeiro Registro Visual",
    description: "Adicionou a primeira foto em Antes & Depois.",
    unlockDescription: "Adicione sua primeira foto em Antes & Depois.",
    category: "PROGRESS",
    icon: "Camera",
    target: 1,
    availability: "AVAILABLE",
  }),
  BEFORE_AFTER_READY: def({
    code: "BEFORE_AFTER_READY",
    title: "Antes & Agora",
    description: "Tem pelo menos duas fotos de progresso.",
    unlockDescription: "Tenha pelo menos duas fotos de progresso.",
    category: "PROGRESS",
    icon: "Images",
    target: 2,
    availability: "AVAILABLE",
  }),
  PROGRESS_30_DAYS: def({
    code: "PROGRESS_30_DAYS",
    rarity: "RARE",
    title: "Um Mês de Jornada",
    description: "Tem registros de progresso separados por pelo menos 30 dias.",
    unlockDescription: "Tenha registros de progresso separados por pelo menos 30 dias.",
    category: "PROGRESS",
    icon: "CalendarCheck",
    target: 30,
    availability: "AVAILABLE",
  }),
  PERSONAL_GOAL_REACHED: def({
    code: "PERSONAL_GOAL_REACHED",
    title: "🎯 Meta Cumprida",
    description: "Concluiu sua primeira meta semanal de atividade.",
    unlockDescription: "Atinja uma das metas semanais de atividade que você definiu.",
    category: "PROGRESS",
    icon: "FlagCheckered",
    target: 1,
    availability: "AVAILABLE",
  }),
  PROGRESS_WEEKS_CONSISTENCY: def({
    code: "PROGRESS_WEEKS_CONSISTENCY",
    title: "Sequência de Progresso",
    description: "Registrou seu progresso visual em várias semanas diferentes.",
    unlockDescription: "Adicione uma foto em Antes & Depois em pelo menos 4 semanas diferentes.",
    category: "PROGRESS",
    icon: "Images",
    target: 4,
    availability: "AVAILABLE",
  }),

  // ── Atividade física ───────────────────────────────────────────────────
  FIRST_ACTIVITY: def({
    code: "FIRST_ACTIVITY",
    title: "Em Movimento",
    description: "Registrou a primeira atividade física válida.",
    unlockDescription: "Registre sua primeira atividade física válida.",
    category: "ACTIVITY",
    icon: "PersonSimpleRun",
    target: 1,
    availability: "AVAILABLE",
  }),
  ACTIVITIES_10: def({
    code: "ACTIVITIES_10",
    title: "10 Atividades",
    description: "Registrou 10 atividades físicas.",
    unlockDescription: "Registre 10 atividades físicas.",
    category: "ACTIVITY",
    icon: "PersonSimpleRun",
    target: 10,
    availability: "AVAILABLE",
  }),
  ACTIVITIES_50: def({
    code: "ACTIVITIES_50",
    title: "50 Atividades",
    description: "Registrou 50 atividades físicas.",
    unlockDescription: "Registre 50 atividades físicas.",
    category: "ACTIVITY",
    icon: "Medal",
    target: 50,
    availability: "AVAILABLE",
  }),
  ACTIVITIES_100: def({
    code: "ACTIVITIES_100",
    rarity: "RARE",
    title: "100 Atividades",
    description: "Registrou 100 atividades físicas.",
    unlockDescription: "Registre 100 atividades físicas.",
    category: "ACTIVITY",
    icon: "Trophy",
    target: 100,
    availability: "AVAILABLE",
  }),
  ACTIVE_3_DAYS_WEEK: def({
    code: "ACTIVE_3_DAYS_WEEK",
    title: "Semana Ativa",
    description: "Registrou atividade em 3 dias diferentes da mesma semana.",
    unlockDescription: "Registre atividade em 3 dias diferentes da mesma semana.",
    category: "ACTIVITY",
    icon: "CalendarCheck",
    target: 3,
    availability: "AVAILABLE",
  }),
  ACTIVE_MINUTES_150: def({
    code: "ACTIVE_MINUTES_150",
    title: "150 Minutos",
    description: "Acumulou 150 minutos de atividades válidas.",
    unlockDescription: "Acumule 150 minutos de atividades válidas.",
    category: "ACTIVITY",
    icon: "Timer",
    target: 150,
    availability: "AVAILABLE",
  }),
  ACTIVITY_EXPLORER: def({
    code: "ACTIVITY_EXPLORER",
    title: "Explorador",
    description: "Registrou pelo menos 5 tipos diferentes de atividade física.",
    unlockDescription: "Registre pelo menos 5 tipos diferentes de atividade física.",
    category: "ACTIVITY",
    icon: "Compass",
    target: 5,
    availability: "AVAILABLE",
  }),
  ACTIVITY_WEEKS_CONSISTENCY: def({
    code: "ACTIVITY_WEEKS_CONSISTENCY",
    title: "Consistência",
    description: "Manteve atividade física regular ao longo de várias semanas.",
    unlockDescription: "Registre atividade física em pelo menos 2 dias diferentes por semana, durante 4 semanas diferentes.",
    category: "ACTIVITY",
    icon: "CalendarCheck",
    target: 4,
    availability: "AVAILABLE",
  }),
  ACTIVE_30_DAYS_TOTAL: def({
    code: "ACTIVE_30_DAYS_TOTAL",
    rarity: "RARE",
    title: "30 Dias em Movimento",
    description: "Registrou atividade física em 30 dias diferentes.",
    unlockDescription: "Registre atividade física em 30 dias diferentes — não precisam ser consecutivos.",
    category: "ACTIVITY",
    icon: "Trophy",
    target: 30,
    availability: "AVAILABLE",
  }),

  // ── Alimentação + atividade ────────────────────────────────────────────
  COMPLETE_ROUTINE: def({
    code: "COMPLETE_ROUTINE",
    title: "Rotina Completa",
    description: "Combinou alimentação e atividade física no mesmo dia.",
    unlockDescription: "Conclua uma refeição planejada e registre uma atividade física válida no mesmo dia.",
    category: "SPECIAL",
    icon: "SealCheck",
    target: 1,
    availability: "AVAILABLE",
  }),
  BALANCED_ROUTINE_WEEK: def({
    code: "BALANCED_ROUTINE_WEEK",
    title: "Semana Equilibrada",
    description: "Combinou alimentação e atividade física em vários dias da mesma semana.",
    unlockDescription: "Em uma mesma semana, combine refeição concluída e atividade física em pelo menos 5 dias diferentes.",
    category: "SPECIAL",
    icon: "Scales",
    target: 1,
    availability: "AVAILABLE",
  }),
  CONSISTENT_ROUTINE: def({
    code: "CONSISTENT_ROUTINE",
    rarity: "RARE",
    title: "Consistência Total",
    description: "Manteve uma rotina equilibrada de alimentação e atividade por várias semanas.",
    unlockDescription: "Alcance uma Semana Equilibrada em pelo menos 4 semanas diferentes.",
    category: "SPECIAL",
    icon: "Sparkle",
    target: 4,
    availability: "AVAILABLE",
  }),

  // ── Social ─────────────────────────────────────────────────────────────
  FIRST_POST: def({
    code: "FIRST_POST",
    title: "Primeira Publicação",
    description: "Fez a primeira publicação válida na Comunidade.",
    unlockDescription: "Faça sua primeira publicação válida na Comunidade.",
    category: "SOCIAL",
    icon: "ChatCircleText",
    target: 1,
    availability: "AVAILABLE",
  }),
  FIRST_FRIEND: def({
    code: "FIRST_FRIEND",
    title: "Primeira Amizade",
    description: "Teve a primeira solicitação de amizade aceita.",
    unlockDescription: "Tenha sua primeira solicitação de amizade aceita.",
    category: "SOCIAL",
    icon: "Handshake",
    target: 1,
    availability: "AVAILABLE",
  }),
  FIRST_GROUP: def({
    code: "FIRST_GROUP",
    title: "Fazendo Parte",
    description: "Entrou no primeiro grupo.",
    unlockDescription: "Entre no seu primeiro grupo.",
    category: "SOCIAL",
    icon: "UsersThree",
    target: 1,
    availability: "AVAILABLE",
  }),
  FIRST_REACTION_RECEIVED: def({
    code: "FIRST_REACTION_RECEIVED",
    title: "Apoio da Comunidade",
    description: "Recebeu a primeira reação em uma publicação.",
    unlockDescription: "Receba sua primeira reação em uma publicação.",
    category: "SOCIAL",
    icon: "Heart",
    target: 1,
    availability: "AVAILABLE",
  }),
  FIRST_COMMENT_RECEIVED: def({
    code: "FIRST_COMMENT_RECEIVED",
    title: "Conversa Iniciada",
    description: "Recebeu o primeiro comentário válido em uma publicação.",
    unlockDescription: "Receba seu primeiro comentário válido em uma publicação.",
    category: "SOCIAL",
    icon: "ChatCircleDots",
    target: 1,
    availability: "AVAILABLE",
  }),

  // ── Desafios e especiais ───────────────────────────────────────────────
  FIRST_CHALLENGE_JOINED: def({
    code: "FIRST_CHALLENGE_JOINED",
    title: "No Desafio",
    description: "Participou do primeiro desafio da Comunidade.",
    unlockDescription: "Entre em um desafio disponível na Comunidade.",
    category: "CHALLENGE",
    icon: "FlagCheckered",
    target: 1,
    availability: "AVAILABLE",
  }),
  FIRST_CHALLENGE_COMPLETED: def({
    code: "FIRST_CHALLENGE_COMPLETED",
    rarity: "UNCOMMON",
    title: "Primeiro Desafio",
    description: "Participou e concluiu o primeiro desafio.",
    unlockDescription: "Participe e conclua seu primeiro desafio.",
    category: "CHALLENGE",
    icon: "Target",
    target: 1,
    availability: "AVAILABLE",
  }),
  BALANCED_WEEK: def({
    code: "BALANCED_WEEK",
    title: "Vida em Equilíbrio",
    description: "Combinou diferentes hábitos ao longo da semana.",
    unlockDescription: "Em uma mesma semana, cumpra os critérios definidos de alimentação acompanhada, hidratação e atividade física.",
    category: "SPECIAL",
    icon: "Sparkle",
    target: 1,
    availability: "AVAILABLE",
  }),
};

export const ACHIEVEMENT_CODES = Object.keys(ACHIEVEMENT_CATALOG);
export const ACHIEVEMENT_TOTAL = ACHIEVEMENT_CODES.length;
