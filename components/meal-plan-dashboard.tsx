"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Sparkles,
  RefreshCw,
  Heart,
  Check,
  Star,
  Flame,
  Clock,
  Trash2,
  ShoppingCart,
  Loader2,
  ChevronDown,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { celebrateStreakIfMilestone } from "@/components/social/AchievementCelebration";
import { queueAchievementUnlocks } from "@/components/achievements/AchievementUnlockProvider";
import MealTypeIcon, { type MealType } from "./MealTypeIcon";
import type { GeneratePlanFormData } from "./GeneratePlanModal";

// Formulário de geração (IA) só abre sob clique — não precisa entrar no
// bundle inicial de /mealplan.
const GeneratePlanModal = dynamic(() => import("./GeneratePlanModal"), { ssr: false });
const ShareMealModal = dynamic(() => import("@/components/social/ShareMealModal"), { ssr: false });

// ─── Tipos locais ─────────────────────────────────────────────────────────────

interface DailyMeal {
  name: string;
  description: string;
  calories: number;
  prep_time: number;
  difficulty: string;
  rating: number;
  emoji?: string;
  proteina?: number;
  carboidratos?: number;
  gordura?: number;
  ingredientes?: string[];
  completed?: boolean;
  is_favorite?: boolean;
}

interface DailyMealPlan {
  breakfast?: DailyMeal | null;
  lunch?: DailyMeal | null;
  dinner?: DailyMeal | null;
  snacks?: DailyMeal[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const buildWeekDays = () => {
  const start = new Date();
  start.setDate(start.getDate() - (start.getDay() === 0 ? 6 : start.getDay() - 1));
  const labels = [
    { short: "Seg", english: "Monday" },
    { short: "Ter", english: "Tuesday" },
    { short: "Qua", english: "Wednesday" },
    { short: "Qui", english: "Thursday" },
    { short: "Sex", english: "Friday" },
    { short: "Sáb", english: "Saturday" },
    { short: "Dom", english: "Sunday" },
  ];
  return labels.map((l, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return { ...l, date: date.getDate() };
  });
};

const mealTypes: { id: string; label: string; type: MealType }[] = [
  { id: "breakfast", label: "Café da Manhã", type: "BREAKFAST" },
  { id: "lunch", label: "Almoço", type: "LUNCH" },
  { id: "dinner", label: "Jantar", type: "DINNER" },
  { id: "snacks", label: "Lanches", type: "SNACK" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const calculateDailySummary = (dayPlan: DailyMealPlan) => {
  if (!dayPlan) return { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };

  let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;

  const addMeal = (meal: DailyMeal | null | undefined) => {
    if (!meal || !meal.completed) return;
    totalCalories += meal.calories || 0;
    if (meal.proteina !== undefined) {
      totalProtein += meal.proteina;
      totalCarbs += meal.carboidratos || 0;
      totalFat += meal.gordura || 0;
    } else {
      totalProtein += Math.round((meal.calories * 0.3) / 4);
      totalCarbs += Math.round((meal.calories * 0.4) / 4);
      totalFat += Math.round((meal.calories * 0.3) / 9);
    }
  };

  addMeal(dayPlan.breakfast);
  addMeal(dayPlan.lunch);
  addMeal(dayPlan.dinner);
  (dayPlan.snacks || []).forEach(addMeal);

  return { totalCalories, totalProtein: Math.round(totalProtein), totalCarbs: Math.round(totalCarbs), totalFat: Math.round(totalFat) };
};

// ─── MealCard ─────────────────────────────────────────────────────────────────

function MealCard({ meal, type, onSwap, onFavorite, isFavorite, onComplete, isComplete, onRate, onShare }: any) {
  const [rating, setRating] = useState(meal?.rating || 0);

  const handleRate = (newRating: number) => {
    setRating(newRating);
    onRate?.(type, newRating);
  };

  const protein = meal?.proteina !== undefined ? meal.proteina : Math.round((meal?.calories * 0.3) / 4);
  const carbs = meal?.carboidratos !== undefined ? meal.carboidratos : Math.round((meal?.calories * 0.4) / 4);
  const fat = meal?.gordura !== undefined ? meal.gordura : Math.round((meal?.calories * 0.3) / 9);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="bg-gradient-to-br from-[#28A745]/20 to-[#007BFF]/20 h-52 flex items-center justify-center relative">
        <span className="text-9xl">{meal?.emoji || "🍽️"}</span>
        <div className="absolute top-4 right-4 flex gap-2">
          <motion.button whileTap={{ scale: 0.9 }} onClick={onSwap} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
            <RefreshCw size={18} className="text-[#007BFF]" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onFavorite} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
            <Heart size={18} className={isFavorite ? "fill-red-500 text-red-500" : "text-slate-400"} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onShare} title="Compartilhar refeição" className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
            <Share2 size={18} className="text-[#28A745]" />
          </motion.button>
        </div>
        <div className="absolute bottom-4 left-4 bg-white rounded-full px-3 py-1 flex items-center gap-1 shadow-md">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onClick={() => handleRate(star)} className="focus:outline-none">
              <Star size={14} className={star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200 hover:text-amber-200"} />
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
          <div className="min-w-0">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800 break-words">{meal?.name}</h3>
            <p className="text-slate-500 mt-1 break-words">{meal?.description}</p>
          </div>
          <div className="flex gap-4 flex-shrink-0">
            <div className="text-center">
              <div className="flex items-center gap-1 text-orange-500">
                <Flame size={18} />
                <span className="font-bold text-slate-800">{meal?.calories}</span>
              </div>
              <span className="text-xs text-slate-400">kcal</span>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-[#007BFF]">
                <Clock size={18} />
                <span className="font-bold text-slate-800">{meal?.prep_time}</span>
              </div>
              <span className="text-xs text-slate-400">min</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
          {[
            { label: "Proteína", value: protein, bg: "bg-blue-50" },
            { label: "Carboidrato", value: carbs, bg: "bg-orange-50" },
            { label: "Gordura", value: fat, bg: "bg-purple-50" },
          ].map((macro, i) => (
            <div key={i} className={`${macro.bg} rounded-2xl p-2.5 sm:p-4 text-center min-w-0`}>
              <p className="text-lg sm:text-2xl font-bold text-slate-800 break-words">{macro.value}g</p>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 break-words">{macro.label}</p>
            </div>
          ))}
        </div>

        {meal?.ingredientes && meal.ingredientes.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-semibold text-slate-600 mb-2">Ingredientes:</p>
            <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {meal.ingredientes.map((ing: string, i: number) => (
                <li key={i} className="flex items-start gap-2 px-3 py-2 text-sm text-slate-600 min-w-0">
                  <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-[#28A745] flex-shrink-0" />
                  <span className="min-w-0 break-words">{ing}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={onComplete}
            className={`flex-1 min-h-[48px] py-3 px-3 rounded-xl font-semibold transition-all flex items-center justify-center text-center break-words ${
              isComplete ? "bg-[#28A745]/10 text-[#28A745] border-2 border-[#28A745] hover:bg-[#28A745]/20" : "bg-[#28A745] hover:bg-[#1e7e34] text-white"
            }`}
          >
            {isComplete ? (
              <>
                <Check size={18} className="mr-2 flex-shrink-0" /> Concluída
              </>
            ) : (
              "Marcar como concluída"
            )}
          </button>
          <button className="flex-1 min-h-[48px] py-3 px-3 rounded-xl border-2 border-[#007BFF] text-[#007BFF] font-semibold hover:bg-[#007BFF]/10 transition-all break-words">
            Ver Receita Completa
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── SwapModal ────────────────────────────────────────────────────────────────

function SwapModal({ isOpen, onClose, onSelect, options, isLoading, isApplying }: any) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-8"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-5 sm:p-8 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
          >
            <h3 className="text-xl font-bold text-slate-800 mb-2">Trocar Refeição</h3>
            <p className="text-slate-500 mb-6">Escolha uma alternativa sugerida pela IA:</p>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 size={28} className="animate-spin text-[#007BFF]" />
                <p className="text-sm text-slate-400">Gerando sugestões personalizadas...</p>
              </div>
            ) : options?.length ? (
              <div className="space-y-3">
                {options.map((opt: any, i: number) => (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.98 }}
                    disabled={isApplying}
                    onClick={() => onSelect(opt)}
                    className="w-full flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-[#007BFF]/10 hover:border-[#007BFF] border-2 border-transparent transition-all disabled:opacity-50"
                  >
                    <span className="text-3xl">{opt.emoji}</span>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-slate-700">{opt.name}</p>
                      <p className="text-sm text-slate-500">{opt.calories} kcal</p>
                    </div>
                    <span className="text-[#007BFF] text-sm font-medium">{isApplying ? "..." : "Selecionar"}</span>
                  </motion.button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">Não foi possível gerar sugestões agora. Tente novamente.</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Dashboard Principal ─────────────────────────────────────────────────────

export default function MealPlanDashboard() {
  const { isSignedIn } = useUser();
  const queryClient = useQueryClient();

  const weekDays = buildWeekDays();
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const [selectedMeal, setSelectedMeal] = useState("lunch");
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{ mealType: string; snackIndex?: number } | null>(null);
  const [showSavedPlans, setShowSavedPlans] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [shareMealTarget, setShareMealTarget] = useState<DailyMeal | null>(null);

  const { data: plansData } = useQuery({
    queryKey: ["meal-plans"],
    queryFn: async () => {
      const res = await fetch("/api/meal-plans");
      if (!res.ok) return { plans: [] };
      return res.json();
    },
    enabled: !!isSignedIn,
  });

  const savedPlans = plansData?.plans ?? [];
  const activePlan = savedPlans.find((p: any) => p.id === selectedPlanId) ?? savedPlans[0] ?? null;

  const generateMutation = useMutation({
    mutationFn: async (formData: GeneratePlanFormData) => {
      const res = await fetch("/api/generate-mealplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar plano");
      return data;
    },
    onSuccess: async (data) => {
      if (!data.mealPlan) return;
      const saveRes = await fetch("/api/meal-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealPlan: data.mealPlan,
          dietType: data.userData?.dietType,
          calories: data.userData?.calories,
          snacks: true,
          name: `Plano ${new Date().toLocaleDateString("pt-BR")}`,
        }),
      });
      const saved = await saveRes.json();
      if (saveRes.ok && saved.plan) {
        setSelectedPlanId(saved.plan.id);
        queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
        setShowGenerateModal(false);
        toast.success("Plano gerado com sucesso!");
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch(`/api/meal-plans/${planId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao deletar plano");
      return res.json();
    },
    onSuccess: (_, planId) => {
      if (selectedPlanId === planId) setSelectedPlanId(null);
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
      toast.success("Plano removido com sucesso!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ planId, favorite }: { planId: string; favorite: boolean }) => {
      const res = await fetch(`/api/meal-plans/${planId}/favorite`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite }),
      });
      if (!res.ok) throw new Error("Erro ao favoritar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
      // FIRST_FAVORITE é resolvida por reconcileAchievements no próximo
      // GET /api/achievements (AchievementUnlockWatcher fica sempre montado
      // e observando essa query) — não precisa de um endpoint dedicado.
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
    },
  });

  const updateMealMutation = useMutation({
    mutationFn: async ({ mealType, snackIndex, patch }: { mealType: string; snackIndex?: number; patch: Record<string, unknown> }) => {
      if (!activePlan) return;
      const res = await fetch(`/api/meal-plans/${activePlan.id}/meals`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: weekDays[selectedDay].english, mealType, snackIndex, patch }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar refeição");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
      queryClient.invalidateQueries({ queryKey: ["community", "gamification"] });
      queryClient.invalidateQueries({ queryKey: ["community", "me"] });
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      queryClient.invalidateQueries({ queryKey: ["community", "challenges"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queueAchievementUnlocks(data?.gamification?.newlyUnlocked);
      celebrateStreakIfMilestone(data?.gamification?.currentStreak);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const dayRecord = activePlan?.days?.find((d: any) => d.day === weekDays[selectedDay].english) ?? null;
  const dayPlan: DailyMealPlan = dayRecord
    ? { breakfast: dayRecord.breakfast, lunch: dayRecord.lunch, dinner: dayRecord.dinner, snacks: dayRecord.snacks || [] }
    : {};
  const dailySummary = calculateDailySummary(dayPlan);
  const currentMeal: DailyMeal | null = selectedMeal === "snacks" ? dayPlan.snacks?.[0] ?? null : (dayPlan[selectedMeal as keyof DailyMealPlan] as DailyMeal) || null;

  const toggleFavorite = () => {
    if (selectedMeal === "snacks") return;
    updateMealMutation.mutate({ mealType: selectedMeal, patch: { is_favorite: !currentMeal?.is_favorite } });
  };

  const toggleComplete = () => {
    if (selectedMeal === "snacks") return;
    updateMealMutation.mutate({ mealType: selectedMeal, patch: { completed: !currentMeal?.completed } });
  };

  const handleRate = (rating: number) => {
    if (selectedMeal === "snacks") return;
    updateMealMutation.mutate({ mealType: selectedMeal, patch: { rating } });
  };

  const swapGenerateMutation = useMutation({
    mutationFn: async ({ mealType, snackIndex }: { mealType: string; snackIndex?: number }) => {
      if (!activePlan) throw new Error("Nenhum plano ativo");
      const res = await fetch(`/api/meal-plans/${activePlan.id}/meals/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: weekDays[selectedDay].english, mealType, snackIndex }),
      });
      if (!res.ok) throw new Error("Erro ao gerar opções de troca");
      return res.json();
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setShowSwapModal(false);
    },
  });

  const applySwapMutation = useMutation({
    mutationFn: async (option: any) => {
      if (!activePlan || !swapTarget) return;
      const res = await fetch(`/api/meal-plans/${activePlan.id}/meals`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day: weekDays[selectedDay].english,
          mealType: swapTarget.mealType,
          snackIndex: swapTarget.snackIndex,
          // swapped: true é o único sinal persistido de "isto veio do fluxo
          // real de troca" — achievement-engine.ts lê esse campo (dentro do
          // JSON do DayPlan, junto de completed/is_favorite/rating) pra
          // resolver FIRST_MEAL_SWAP. Nunca reavaliado como "quantidade de
          // trocas": uma vez marcado, a conquista é bool (primeira troca real).
          patch: { ...option, completed: false, is_favorite: false, rating: 0, swapped: true },
        }),
      });
      if (!res.ok) throw new Error("Erro ao trocar refeição");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      toast.success("Refeição trocada com sucesso!");
      setShowSwapModal(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openSwap = (mealType: string, snackIndex?: number) => {
    setSwapTarget({ mealType, snackIndex });
    setShowSwapModal(true);
    swapGenerateMutation.mutate({ mealType, snackIndex });
  };

  const weekStart = weekDays[0].date;
  const weekEnd = weekDays[6].date;
  const monthLabel = new Date().toLocaleDateString("pt-BR", { month: "long" });

  return (
    <div className="p-4 sm:p-8">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Semana de {weekStart} a {weekEnd} de {monthLabel}
          </h2>
          <p className="text-sm text-slate-500">{activePlan ? "Plano gerado pela IA com base nas suas preferências" : "Gere seu primeiro plano personalizado com IA"}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {savedPlans.length > 0 && (
            <button
              onClick={() => setShowSavedPlans((v) => !v)}
              className="text-sm rounded-xl border border-slate-200 px-4 py-2.5 text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
            >
              Meus Planos ({savedPlans.length})
              <ChevronDown size={14} className={`transition-transform ${showSavedPlans ? "rotate-180" : ""}`} />
            </button>
          )}
          <button
            onClick={() => setShowGenerateModal(true)}
            className="bg-[#007BFF] hover:bg-[#0056b3] rounded-xl px-6 py-2.5 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-60 transition-colors"
          >
            <Sparkles size={16} />
            Gerar Novo Plano
          </button>
        </div>
      </div>

      {/* Saved plans panel */}
      <AnimatePresence>
        {showSavedPlans && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100">
              {savedPlans.map((plan: any) => (
                <div key={plan.id} className="p-4 flex justify-between items-center gap-3">
                  <button
                    className="text-left min-w-0 flex-1"
                    onClick={() => { setSelectedPlanId(plan.id); setShowSavedPlans(false); }}
                  >
                    <p className="font-medium text-slate-800 text-sm truncate">{plan.name || "Plano sem nome"}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {plan.dietType || "Personalizado"} • {plan.calories ? `${plan.calories} kcal` : ""} • {new Date(plan.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </button>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleFavoriteMutation.mutate({ planId: plan.id, favorite: !plan.favorite })}
                      className={`p-2 rounded-lg transition-colors ${plan.favorite ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-400"}`}
                      title={plan.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    >
                      <Heart size={16} className={plan.favorite ? "fill-red-500" : ""} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Tem certeza que deseja excluir este plano?")) deletePlanMutation.mutate(plan.id);
                      }}
                      className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                      title="Excluir plano"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Day selector — grid de 7 colunas, sempre cabe na largura disponível, sem scroll horizontal */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-8 bg-white rounded-2xl p-1.5 sm:p-2 shadow-sm border border-slate-100">
        {weekDays.map((day, i) => (
          <motion.button
            key={day.short}
            whileTap={{ scale: 0.96 }}
            onClick={() => setSelectedDay(i)}
            aria-current={selectedDay === i ? "true" : undefined}
            className={`min-w-0 py-2 sm:py-3 rounded-xl transition-all ${selectedDay === i ? "bg-[#007BFF] text-white shadow-md shadow-[#007BFF]/30" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <p className="text-[10px] sm:text-xs font-medium uppercase truncate px-0.5">{day.short}</p>
            <p className="text-sm sm:text-lg font-bold mt-0.5">{day.date}</p>
          </motion.button>
        ))}
      </div>

      {!activePlan ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
          <p className="text-6xl mb-4">🥗</p>
          <p className="text-xl font-semibold text-slate-700 mb-2">Nenhum plano gerado</p>
          <p className="text-slate-500 mb-6">Clique em &quot;Gerar Novo Plano&quot; para criar seu plano semanal personalizado pela IA</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column */}
          <div className="lg:col-span-3 space-y-2">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Refeições</h3>
            {mealTypes.map(({ id, label, type }) => {
              const isActive = selectedMeal === id;
              const mealForType = id === "snacks" ? null : (dayPlan[id as keyof DailyMealPlan] as DailyMeal | null | undefined);
              const isComplete = id === "snacks" ? !!dayPlan.snacks?.length && dayPlan.snacks.every((s) => s.completed) : !!mealForType?.completed;
              const isFav = id === "snacks" ? !!dayPlan.snacks?.some((s) => s.is_favorite) : !!mealForType?.is_favorite;

              return (
                <motion.button
                  key={id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedMeal(id)}
                  className={`w-full p-4 rounded-2xl flex items-center gap-3 text-left transition-all ${
                    isActive ? "bg-[#007BFF] text-white shadow-lg shadow-[#007BFF]/30" : "bg-white text-slate-600 border border-slate-100 hover:border-[#007BFF]/30"
                  }`}
                >
                  <MealTypeIcon type={type} className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium flex-1 min-w-0 truncate">{label}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isFav && <Heart size={14} className={isActive ? "text-red-300 fill-red-300" : "text-red-400 fill-red-400"} />}
                    {isComplete && (
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isActive ? "bg-white/20" : "bg-[#28A745]"}`}>
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}

            {/* Daily Summary */}
            <div className="bg-slate-800 rounded-2xl p-4 mt-4 text-white">
              <h4 className="text-sm font-semibold mb-0.5">Resumo do Dia</h4>
              <p className="text-xs text-white/50 mb-3">Refeições concluídas</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-xl p-2 text-center">
                  <p className="text-lg font-bold">{dailySummary.totalCalories}</p>
                  <p className="text-xs text-white/60">kcal</p>
                </div>
                <div className="bg-white/10 rounded-xl p-2 text-center">
                  <p className="text-lg font-bold text-[#28A745]">{dailySummary.totalProtein}g</p>
                  <p className="text-xs text-white/60">proteína</p>
                </div>
                <div className="bg-white/10 rounded-xl p-2 text-center">
                  <p className="text-lg font-bold text-orange-400">{dailySummary.totalCarbs}g</p>
                  <p className="text-xs text-white/60">carbs</p>
                </div>
                <div className="bg-white/10 rounded-xl p-2 text-center">
                  <p className="text-lg font-bold text-purple-400">{dailySummary.totalFat}g</p>
                  <p className="text-xs text-white/60">gordura</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-9">
            <AnimatePresence mode="wait">
              {selectedMeal !== "snacks" ? (
                currentMeal ? (
                  <MealCard
                    key={`${selectedDay}-${selectedMeal}`}
                    meal={currentMeal}
                    type={selectedMeal}
                    onSwap={() => openSwap(selectedMeal)}
                    onFavorite={toggleFavorite}
                    isFavorite={!!currentMeal.is_favorite}
                    onComplete={toggleComplete}
                    isComplete={!!currentMeal.completed}
                    onRate={(_type: string, rating: number) => {
                      handleRate(rating);
                      toast.success(`Avaliação ${rating}⭐ registrada!`);
                    }}
                    onShare={() => setShareMealTarget(currentMeal)}
                  />
                ) : (
                  <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
                    <p className="text-slate-400">Nenhuma refeição definida para este dia</p>
                  </div>
                )
              ) : (
                <motion.div key="snacks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(dayPlan.snacks || []).map((snack, i) => (
                    <div key={i} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-4">
                      <span className="text-6xl">{snack.emoji || "🍪"}</span>
                      <div className="text-center">
                        <h4 className="text-xl font-bold text-slate-800">{snack.name}</h4>
                        <p className="text-slate-500 mt-1">{snack.calories} kcal</p>
                      </div>
                      <button
                        onClick={() => openSwap("snacks", i)}
                        className="w-full py-3 border-2 border-[#007BFF] text-[#007BFF] rounded-xl font-medium hover:bg-[#007BFF]/10 transition-all flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={16} /> Trocar
                      </button>
                    </div>
                  ))}
                  {!dayPlan.snacks?.length && (
                    <div className="sm:col-span-2 bg-white rounded-3xl p-8 text-center border border-slate-100">
                      <p className="text-slate-400">Nenhum lanche para este dia</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Shopping List */}
            <div className="mt-6">
              <Link href="/shopping" className="inline-flex items-center gap-2 bg-[#007BFF] hover:bg-[#0056b3] text-white px-6 py-3 rounded-xl font-medium transition-colors">
                <ShoppingCart size={18} />
                Ver Lista de Compras
              </Link>
            </div>
          </div>
        </div>
      )}

      <SwapModal
        isOpen={showSwapModal}
        onClose={() => setShowSwapModal(false)}
        options={swapGenerateMutation.data?.options}
        isLoading={swapGenerateMutation.isPending}
        isApplying={applySwapMutation.isPending}
        onSelect={(option: any) => applySwapMutation.mutate(option)}
      />

      <GeneratePlanModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onSubmit={(formData) => generateMutation.mutate(formData)}
        isPending={generateMutation.isPending}
      />

      {shareMealTarget && (
        <ShareMealModal
          mealName={shareMealTarget.name}
          calories={shareMealTarget.calories}
          protein={shareMealTarget.proteina}
          carbs={shareMealTarget.carboidratos}
          fat={shareMealTarget.gordura}
          onClose={() => setShareMealTarget(null)}
        />
      )}
    </div>
  );
}
