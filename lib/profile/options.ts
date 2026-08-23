// lib/profile/options.ts
// Opções centralizadas usadas por onboarding, EditProfileModal e
// GeneratePlanModal. Nunca duplicar essas listas em outro arquivo.

export const DIET_TYPES = [
  { value: "tradicional", label: "Tradicional", icon: "🍽️", desc: "Alimentação balanceada sem restrições" },
  { value: "vegetariana", label: "Vegetariana", icon: "🥬", desc: "Sem carne, com ovos e laticínios" },
  { value: "vegana", label: "Vegana", icon: "🌱", desc: "Apenas alimentos de origem vegetal" },
  { value: "low_carb", label: "Low Carb", icon: "🥩", desc: "Baixo consumo de carboidratos" },
  { value: "cetogenica", label: "Cetogênica", icon: "🥓", desc: "Muito baixo carbo, alta gordura" },
  { value: "mediterranea", label: "Mediterrânea", icon: "🫒", desc: "Azeite, peixes e grãos integrais" },
] as const;

export const DIET_TYPE_VALUES = DIET_TYPES.map((d) => d.value);

export const ALLERGY_OPTIONS = [
  { value: "Glúten", label: "Glúten" },
  { value: "Lactose", label: "Lactose" },
  { value: "Ovos", label: "Ovos" },
  { value: "Frutos do mar", label: "Frutos do mar" },
  { value: "Amendoim", label: "Amendoim" },
  { value: "Soja", label: "Soja" },
] as const;

// Sugestões de "gosto de / não gosto de" — usuário também pode digitar valores livres.
export const FOOD_SUGGESTION_OPTIONS = [
  "Brasileira",
  "Italiana",
  "Japonesa",
  "Mexicana",
  "Árabe",
  "Indiana",
  "Frango",
  "Peixe",
  "Massas",
  "Saladas",
  "Doces",
] as const;

// icon é uma chave de components/icon-registry.tsx (nunca emoji).
export const COOKING_LEVELS = [
  { value: "iniciante", label: "Iniciante", desc: "Preciso de receitas simples e rápidas", icon: "Baby" },
  { value: "intermediario", label: "Intermediário", desc: "Consigo seguir receitas normalmente", icon: "ChefHat" },
  { value: "avancado", label: "Avançado", desc: "Adoro desafios na cozinha", icon: "Star" },
] as const;

export const COOKING_LEVEL_VALUES = COOKING_LEVELS.map((c) => c.value);

// UI em português, valor interno já usado pelo restante do projeto.
export const DIET_GOALS = [
  { value: "perder peso", label: "Perder peso" },
  { value: "manter", label: "Manter peso" },
  { value: "ganhar massa", label: "Ganhar peso/massa" },
] as const;

export const DIET_GOAL_VALUES = DIET_GOALS.map((g) => g.value);

export const BUDGET_LEVELS = [
  { value: "low", label: "Econômico" },
  { value: "medium", label: "Moderado" },
  { value: "high", label: "Flexível" },
] as const;

export const BUDGET_LEVEL_VALUES = BUDGET_LEVELS.map((b) => b.value);

export const MAX_PREP_TIME_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
  { value: null, label: "Sem preferência" },
] as const;

// Usado para personalizar o cálculo calórico (Profile.activityLevel). Nunca
// exposto na Comunidade — ver lib/profile/validation.ts.
export const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentário" },
  { value: "light", label: "Levemente ativo" },
  { value: "moderate", label: "Moderadamente ativo" },
  { value: "active", label: "Muito ativo" },
] as const;

export const ACTIVITY_LEVEL_VALUES = ACTIVITY_LEVELS.map((a) => a.value);

/** Idade em anos completos a partir da data de nascimento. */
export function calculateAge(birthDate: Date | string): number {
  const date = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > date.getMonth() || (today.getMonth() === date.getMonth() && today.getDate() >= date.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export function findLabel<T extends { value: unknown; label: string }>(options: readonly T[], value: unknown): string | undefined {
  return options.find((o) => o.value === value)?.label;
}

/** Converte altura em centímetros para exibição "1,75 m". */
export function formatHeightMeters(heightCm?: number | null): string {
  if (!heightCm) return "—";
  return `${(heightCm / 100).toFixed(2).replace(".", ",")} m`;
}
