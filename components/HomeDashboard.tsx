// components/HomeDashboard.tsx
"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Sparkles, Flame, Droplets, Target, ChefHat, PlayCircle, RefreshCw, Star } from "lucide-react";
import Link from "next/link";
import StatCard from "./StatCard";
import AdherenceRing from "./AdherenceRing";
import WeightChart from "./WeightChart";

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TIMES: Record<string, string> = { breakfast: "07:30", lunch: "12:30", snack: "15:30", dinner: "19:30" };
const MEAL_LABELS: Record<string, string> = { breakfast: "Café da Manhã", lunch: "Almoço", snack: "Lanche", dinner: "Jantar" };

export default function HomeDashboard() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const todayKey = DAY_ORDER[today.getDay() === 0 ? 6 : today.getDay() - 1];

  const { data: physicalData } = useQuery({
    queryKey: ["physical-data"],
    queryFn: async () => {
      const res = await fetch("/api/user/physical-data");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: weightLogsRaw = [] } = useQuery({
    queryKey: ["weight-logs"],
    queryFn: async () => {
      const res = await fetch("/api/weight-logs");
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.logs)) return data.logs;
      return [];
    },
  });

  const { data: plansData } = useQuery({
    queryKey: ["meal-plans"],
    queryFn: async () => {
      const res = await fetch("/api/meal-plans");
      if (!res.ok) return { plans: [] };
      return res.json();
    },
  });

  const { data: favoritePlansData } = useQuery({
    queryKey: ["meal-plans", "favorites"],
    queryFn: async () => {
      const res = await fetch("/api/meal-plans?favorites=true");
      if (!res.ok) return { plans: [] };
      return res.json();
    },
  });

  const latestPlan = plansData?.plans?.[0] ?? null;
  const todayPlan = latestPlan?.days?.find((d: any) => d.day === todayKey) ?? null;

  const todayMeals = todayPlan
    ? [
        todayPlan.breakfast && { key: "breakfast", ...todayPlan.breakfast },
        todayPlan.lunch && { key: "lunch", ...todayPlan.lunch },
        ...(Array.isArray(todayPlan.snacks) ? todayPlan.snacks.map((s: any, idx: number) => ({ key: "snack", snackIndex: idx, ...s })) : []),
        todayPlan.dinner && { key: "dinner", ...todayPlan.dinner },
      ].filter(Boolean)
    : [];

  const completedCount = todayMeals.filter((m: any) => m.completed).length;
  const daysWithMeals = latestPlan ? latestPlan.days.filter((d: any) => d.breakfast || d.lunch || d.dinner).length : 0;
  const adherence = todayMeals.length ? Math.round((completedCount / todayMeals.length) * 100) : 0;
  const todayCalories = todayMeals.filter((m: any) => m.completed).reduce((acc, m: any) => acc + (m?.calories || 0), 0);
  const calorieTarget: number | undefined = latestPlan?.calories;

  const weightLogs = weightLogsRaw.map((log: any) => ({
    date: new Date(log.date).toLocaleDateString("pt-BR", { month: "short", day: "numeric" }),
    weight: log.weight,
  }));

  const toggleMealMutation = useMutation({
    mutationFn: async ({ mealType, snackIndex, completed }: { mealType: string; snackIndex?: number; completed: boolean }) => {
      if (!latestPlan) return;
      const res = await fetch(`/api/meal-plans/${latestPlan.id}/meals`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day: todayKey,
          mealType: mealType === "snack" ? "snacks" : mealType,
          snackIndex,
          patch: { completed },
        }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar refeição");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meal-plans"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  // Texto local instantâneo, exibido enquanto a dica real da IA carrega (ou se a chamada falhar)
  const fallbackTip = !latestPlan
    ? "Complete seu perfil e gere um plano para receber dicas personalizadas da IA."
    : calorieTarget && todayCalories > calorieTarget * 1.15
    ? `Você já consumiu ${todayCalories} kcal hoje, acima da sua meta de ${calorieTarget} kcal. Que tal uma refeição mais leve no restante do dia?`
    : calorieTarget && completedCount > 0 && todayCalories < calorieTarget * 0.5
    ? `Você está em ${todayCalories} kcal hoje, bem abaixo da meta de ${calorieTarget} kcal. Não pule refeições!`
    : `Você está indo muito bem! 🎉 Mantenha a consistência no seu plano ${physicalData?.dietType?.replace("_", " ") || ""}.`;

  const { data: aiTipData } = useQuery({
    queryKey: ["ai-tip", todayKey, latestPlan?.id],
    queryFn: async () => {
      const res = await fetch("/api/ai-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todayCalories, calorieTarget, completedCount, totalMeals: todayMeals.length, hasPlan: !!latestPlan }),
      });
      if (!res.ok) throw new Error("Erro ao buscar dica");
      return res.json();
    },
    enabled: !!plansData,
    staleTime: 1000 * 60 * 60,
    retry: false,
  });

  const aiTip = aiTipData?.tip || fallbackTip;

  return (
    <div className="p-4 sm:p-8">
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-[#007BFF] to-[#0056b3] rounded-3xl p-5 sm:p-8 mb-8 text-white relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 w-64 h-full opacity-10">
          <div className="text-[180px] absolute -right-8 -top-4">🥗</div>
        </div>
        <div className="relative">
          <p className="text-white/80 mb-1">
            {greeting}, {user?.firstName || "por aqui"}! 👋
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">{latestPlan ? "Seu plano está atualizado" : "Vamos montar seu plano?"}</h2>
          <p className="text-white/80 max-w-xl">
            {latestPlan
              ? "Continue seguindo suas refeições de hoje — você está indo muito bem!"
              : "Gere um plano alimentar semanal personalizado com IA em segundos."}
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            {latestPlan ? (
              <Link href="/mealplan" className="bg-white text-[#007BFF] hover:bg-white/90 rounded-xl font-semibold px-4 py-2.5 flex items-center text-sm">
                <Sparkles size={16} className="mr-2" />
                Ver Plano de Hoje
              </Link>
            ) : null}
            <Link href="/mealplan" className="text-white border border-white/30 hover:bg-white/10 rounded-xl px-4 py-2.5 flex items-center text-sm font-medium">
              Gerar Novo Plano
            </Link>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard icon={Flame} label="Calorias hoje" value={todayCalories.toString()} subtext={latestPlan ? `/ ${latestPlan.calories || "—"} kcal` : undefined} color="orange" />
            <StatCard icon={Droplets} label="Hidratação" value="—" subtext="em breve" color="blue" />
            <StatCard icon={Target} label="Meta semanal" value={`${daysWithMeals}/7`} subtext="dias" color="green" />
            <StatCard icon={Star} label="Receitas favoritas" value={(favoritePlansData?.plans?.length ?? 0).toString()} color="purple" />
          </div>

          {/* Today's meals */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800">Refeições de Hoje</h2>
              <Link href="/mealplan" className="text-sm rounded-full border border-[#007BFF] text-[#007BFF] px-3 py-1.5 flex items-center gap-1 hover:bg-[#007BFF]/5 transition-colors">
                <RefreshCw size={14} />
                Trocar refeição
              </Link>
            </div>

            {todayMeals.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Nenhum plano ativo para hoje. Gere um plano para ver suas refeições aqui.</p>
            ) : (
              <div className="space-y-4">
                {todayMeals.map((meal: any, i: number) => {
                  const done = !!meal.completed;
                  return (
                    <motion.div
                      key={`${meal.key}-${i}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        done ? "bg-[#28A745]/5 border-[#28A745]/30" : "bg-slate-50 border-slate-100 hover:border-slate-200"
                      }`}
                      onClick={() => toggleMealMutation.mutate({ mealType: meal.key, snackIndex: meal.snackIndex, completed: !done })}
                    >
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-slate-100 flex-shrink-0">
                        {meal.emoji || "🍽️"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{MEAL_LABELS[meal.key]}</p>
                        <h4 className="font-semibold text-slate-800 truncate">{meal.name}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-slate-500">{meal.calories} kcal</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-sm text-slate-500">{MEAL_TIMES[meal.key]}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex">
                          {[...Array(5)].map((_, j) => (
                            <Star key={j} size={14} className={j < (meal.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-200"} />
                          ))}
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${done ? "bg-[#28A745]" : "bg-slate-200"}`}>
                          {done ? <span className="text-white text-xs">✓</span> : <span className="text-slate-400 text-xs">○</span>}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          <WeightChart weightLogs={weightLogs} startWeight={physicalData?.startWeight} targetWeight={physicalData?.targetWeight} currentWeight={physicalData?.currentWeight} />
        </div>

        {/* Right column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Adherence */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4">Adesão ao Plano</h3>
            <div className="flex justify-center">
              <AdherenceRing percentage={adherence} size={140} />
            </div>
            <div className="space-y-3 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#007BFF]" />
                <span className="text-sm text-slate-600 flex-1">Refeições concluídas hoje</span>
                <span className="text-sm font-semibold text-slate-800">
                  {completedCount}/{todayMeals.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#28A745]" />
                <span className="text-sm text-slate-600 flex-1">Receitas favoritas</span>
                <span className="text-sm font-semibold text-slate-800">{favoritePlansData?.plans?.length ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-400" />
                <span className="text-sm text-slate-600 flex-1">Dias com plano na semana</span>
                <span className="text-sm font-semibold text-slate-800">{daysWithMeals}/7</span>
              </div>
            </div>
          </div>

          {/* AI tip */}
          <div className="bg-gradient-to-br from-[#28A745]/10 to-[#007BFF]/10 rounded-3xl p-6 border border-[#28A745]/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#28A745] to-[#007BFF] rounded-xl flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <span className="font-semibold text-slate-800">Dica da IA</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{aiTip}</p>
            <Link
              href={latestPlan ? "/mealplan" : "/profile"}
              className="mt-4 w-full bg-[#007BFF] hover:bg-[#0056b3] rounded-xl text-white text-sm font-medium py-2 flex items-center justify-center"
            >
              {latestPlan ? "Ver plano semanal" : "Completar perfil"}
            </Link>
          </div>

          {/* Quick cook mode */}
          <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl p-6 text-white cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <ChefHat size={24} />
              <h3 className="font-bold">Não sei cozinhar</h3>
            </div>
            <p className="text-sm text-white/80 mb-4">Receitas com até 5 ingredientes e passo a passo em vídeo</p>
            <div className="bg-white/20 rounded-xl p-3 flex items-center gap-3">
              <PlayCircle size={24} />
              <span className="text-sm font-medium">Assistir vídeo rápido</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
