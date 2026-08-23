// app/shared/[token]/page.tsx
// Página pública (sem autenticação) de leitura de um plano compartilhado via
// POST /api/meal-plans/[id]/share. Server Component — não usa React Query.
import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, Flame, Leaf, Eye, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { safeParse } from "@/lib/mealplan";

type Params = { params: Promise<{ token: string }> };

type SharedMeal = {
  nome?: string;
  descricao?: string;
  emoji?: string;
  calorias?: number;
  proteina?: number;
  carboidratos?: number;
  gordura?: number;
  tempo_preparo?: number;
  dificuldade?: string;
  ingredientes?: string[];
};

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_LABELS: Record<string, string> = {
  Monday: "Segunda-feira",
  Tuesday: "Terça-feira",
  Wednesday: "Quarta-feira",
  Thursday: "Quinta-feira",
  Friday: "Sexta-feira",
  Saturday: "Sábado",
  Sunday: "Domingo",
};

const getSharedPlan = cache(async (token: string) => {
  return prisma.sharedPlan.findUnique({
    where: { shareToken: token },
    include: { mealPlan: { include: { days: true } } },
  });
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token } = await params;
  const shared = await getSharedPlan(token);
  return {
    title: shared
      ? `${shared.mealPlan.name || "Plano alimentar"} | SmartPlateAI`
      : "Plano não encontrado | SmartPlateAI",
  };
}

function MealBlock({ label, meal }: { label: string; meal: SharedMeal | null }) {
  if (!meal) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        {typeof meal.tempo_preparo === "number" && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock size={12} /> {meal.tempo_preparo} min
          </span>
        )}
      </div>
      <p className="font-semibold text-slate-800 flex items-center gap-2">
        <span>{meal.emoji}</span> {meal.nome || "Refeição"}
      </p>
      {meal.descricao && <p className="text-sm text-slate-500 mt-1">{meal.descricao}</p>}
      {typeof meal.calorias === "number" && (
        <div className="flex items-center gap-1 text-xs text-[#28A745] font-medium mt-2">
          <Flame size={12} /> {meal.calorias} kcal
        </div>
      )}
    </div>
  );
}

export default async function SharedPlanPage({ params }: Params) {
  const { token } = await params;
  const shared = await getSharedPlan(token);

  if (!shared) notFound();

  const expired = !!shared.expiresAt && shared.expiresAt.getTime() < Date.now();

  if (!expired) {
    await prisma.sharedPlan.update({
      where: { id: shared.id },
      data: { views: { increment: 1 } },
    });
  }

  if (expired) {
    return (
      <div className="max-w-lg mx-auto mt-24 text-center p-8 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="w-14 h-14 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <CalendarDays className="text-slate-400" size={24} />
        </div>
        <h1 className="text-lg font-bold text-slate-800">Este link expirou</h1>
        <p className="text-sm text-slate-500 mt-2">Peça para a pessoa que compartilhou gerar um novo link.</p>
      </div>
    );
  }

  const plan = shared.mealPlan;
  const days = [...plan.days].sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-[#007BFF] to-[#28A745] rounded-xl flex items-center justify-center shadow-md">
            <Leaf size={18} className="text-white" />
          </div>
          <span className="text-sm font-bold text-slate-800">
            SmartPlate<span className="text-[#28A745]">AI</span>
          </span>
          <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
            <Eye size={12} /> {shared.views + 1} visualizações
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">{plan.name || "Plano alimentar compartilhado"}</h1>
        <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
          {plan.dietType && <span>{plan.dietType}</span>}
          {plan.calories ? <span>• {plan.calories} kcal/dia</span> : null}
        </div>
      </div>

      <div className="space-y-4">
        {days.map((day) => {
          const breakfast = safeParse<SharedMeal>(day.breakfast);
          const lunch = safeParse<SharedMeal>(day.lunch);
          const dinner = safeParse<SharedMeal>(day.dinner);
          const snacks = safeParse<SharedMeal[]>(day.snacks) || [];

          return (
            <div key={day.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-bold text-slate-800 mb-3">{DAY_LABELS[day.day] || day.day}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MealBlock label="Café da manhã" meal={breakfast} />
                <MealBlock label="Almoço" meal={lunch} />
                <MealBlock label="Jantar" meal={dinner} />
                {snacks.map((snack, i) => (
                  <MealBlock key={i} label="Lanche" meal={snack} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-400 mt-8">
        Plano gerado com IA no SmartPlateAI. Crie o seu em smartplateai.
      </p>
    </div>
  );
}
