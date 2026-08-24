// components/MealTypeIcon.tsx
// Ícone único e centralizado por TIPO de refeição (nunca um alimento
// específico) — reutilizado em qualquer lugar que precise representar
// Café da manhã/Almoço/Lanche/Jantar, para nunca duplicar essa condição em
// vários componentes (Início, Plano Semanal, ...).
import { Coffee, Sun, Moon, Cookie, type LucideIcon } from "lucide-react";

export type MealType = "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER";

const MEAL_TYPE_ICON: Record<MealType, LucideIcon> = {
  BREAKFAST: Coffee,
  LUNCH: Sun,
  SNACK: Cookie,
  DINNER: Moon,
};

export default function MealTypeIcon({ type, className }: { type: MealType; className?: string }) {
  const Icon = MEAL_TYPE_ICON[type];
  return <Icon className={className ?? "w-full h-full"} aria-hidden="true" />;
}
