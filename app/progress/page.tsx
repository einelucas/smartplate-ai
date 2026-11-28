"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Toaster } from "react-hot-toast";
import { Spinner } from "@/components/spinner";
import { Scale, Ruler, Target, Edit, Flame, Star, Trophy, Share2 } from "lucide-react";
import AdherenceRing from "@/components/AdherenceRing";
import ChartSkeleton from "@/components/skeletons/ChartSkeleton";
import ProfileSkeleton from "@/components/skeletons/ProfileSkeleton";
import BeforeAfterSection from "@/components/BeforeAfterSection";
import AchievementsSummaryCard from "@/components/AchievementsSummaryCard";
import ActivitySummaryCard from "@/components/ActivitySummaryCard";
import ActivityGoalsCard from "@/components/ActivityGoalsCard";
import ActivityInsightsCard from "@/components/ActivityInsightsCard";
import { useProfile } from "@/hooks/useProfile";
import { formatHeightMeters, findLabel, DIET_GOALS, DIET_TYPES, COOKING_LEVELS, BUDGET_LEVELS } from "@/lib/profile/options";
import { calculateMealAdherence } from "@/lib/mealplan";

const WeightChart = dynamic(() => import("@/components/WeightChart"), { ssr: false, loading: () => <ChartSkeleton /> });
const StatisticsStoryModal = dynamic(() => import("@/components/StatisticsStoryModal"), { ssr: false });
const EditProfileModal = dynamic(() => import("@/components/EditProfileModal"), { ssr: false });

interface WeightLog {
  id: string;
  weight: number;
  date: string;
}

export default function ProgressPage() {
  const { isLoaded, isSignedIn, user } = useUser();

  const {
    physicalData,
    preferences,
    socialProfile,
    gamification,
    isLoading: profileHookLoading,
    addWeightLog,
  } = useProfile();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [showStatisticsStory, setShowStatisticsStory] = useState(false);

  const { data: weightLogs = [], isLoading: isLoadingWeightLogs } = useQuery<WeightLog[]>({
    queryKey: ["weight-logs"],
    queryFn: async () => {
      const res = await fetch("/api/weight-logs");
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.logs)) return data.logs;
      return [];
    },
    enabled: !!isSignedIn,
  });

  const { data: plansData } = useQuery({
    queryKey: ["meal-plans"],
    queryFn: async () => {
      const res = await fetch("/api/meal-plans");
      if (!res.ok) return { plans: [] };
      return res.json();
    },
    enabled: !!isSignedIn,
  });

  const { data: favoritePlansData } = useQuery({
    queryKey: ["meal-plans", "favorites"],
    queryFn: async () => {
      const res = await fetch("/api/meal-plans?favorites=true");
      if (!res.ok) return { plans: [] };
      return res.json();
    },
    enabled: !!isSignedIn,
  });

  const currentWeight = physicalData?.currentWeight;
  const startWeight = physicalData?.startWeight;
  const targetWeight = physicalData?.targetWeight;
  const userHeight = physicalData?.height;

  const latestPlan = plansData?.plans?.[0] ?? null;
  const adherence = calculateMealAdherence(latestPlan?.days);
  const favoriteCount = favoritePlansData?.plans?.length ?? 0;

  const displayName = socialProfile?.displayName || user?.fullName || user?.firstName || "Usuário";
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Spinner />
        <span className="ml-2 text-slate-600">Carregando...</span>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <p className="text-slate-600">Faça login para visualizar seu progresso.</p>
      </div>
    );
  }

  const isLoading = isLoadingWeightLogs || profileHookLoading;

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="p-4 sm:p-8">
      <Toaster position="top-center" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna esquerda */}
        <div className="lg:col-span-4 space-y-6">
          {/* Dados físicos e preferências antes disponíveis no Perfil */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-medium text-slate-800">Dados físicos</h2>
              <button type="button" onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-1.5 text-sm text-slate-600 rounded-lg border border-slate-200 px-3 py-2"><Edit size={15} /> Editar</button>
            </div>
            {(currentWeight !== undefined || userHeight !== undefined || targetWeight !== undefined) && (
              <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-5">
                <div className="text-center">
                  <div className="w-10 h-10 bg-[#007BFF]/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Scale size={18} className="text-[#007BFF]" />
                  </div>
                  <p className="text-lg font-bold text-slate-800">{currentWeight !== undefined ? `${currentWeight}kg` : "—"}</p>
                  <p className="text-xs text-slate-400">Atual</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-[#28A745]/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Ruler size={18} className="text-[#28A745]" />
                  </div>
                  <p className="text-lg font-bold text-slate-800">{formatHeightMeters(userHeight)}</p>
                  <p className="text-xs text-slate-400">Altura</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Target size={18} className="text-orange-500" />
                  </div>
                  <p className="text-lg font-bold text-slate-800">{targetWeight !== undefined ? `${targetWeight}kg` : "—"}</p>
                  <p className="text-xs text-slate-400">Meta</p>
                </div>
              </div>
            )}

            {(startWeight !== undefined || preferences?.dietGoal) && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                {startWeight !== undefined && <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">Início: {startWeight}kg</span>}
                {preferences?.dietGoal && (
                  <span className="px-3 py-1 bg-[#007BFF]/10 text-[#007BFF] rounded-full text-xs font-medium">
                    {findLabel(DIET_GOALS, preferences.dietGoal) ?? preferences.dietGoal}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Preferências */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Preferências</h3>
            <div className="flex flex-wrap gap-2">
              {physicalData?.dietType && (
                <span className="px-3 py-1 bg-[#007BFF]/10 text-[#007BFF] rounded-full text-xs font-medium">
                  {findLabel(DIET_TYPES, physicalData.dietType) ?? physicalData.dietType}
                </span>
              )}
              {physicalData?.cookingLevel && (
                <span className="px-3 py-1 bg-[#28A745]/10 text-[#28A745] rounded-full text-xs font-medium">
                  {findLabel(COOKING_LEVELS, physicalData.cookingLevel) ?? physicalData.cookingLevel}
                </span>
              )}
              {preferences?.budgetLevel && (
                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                  {findLabel(BUDGET_LEVELS, preferences.budgetLevel) ?? preferences.budgetLevel}
                </span>
              )}
              {preferences?.maxPrepTime && (
                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">Até {preferences.maxPrepTime} min</span>
              )}
            </div>
            {(preferences?.allergies?.length ?? 0) > 0 && (
              <div className="mt-3">
                <p className="text-xs text-slate-400 mb-1.5">Alergias</p>
                <div className="flex flex-wrap gap-1.5">
                  {preferences!.allergies.map((a) => (
                    <span key={a} className="px-2 py-0.5 bg-red-50 text-red-500 rounded-full text-xs">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(preferences?.preferredFoods?.length ?? 0) > 0 && (
              <div className="mt-3">
                <p className="text-xs text-slate-400 mb-1.5">Gosta de</p>
                <div className="flex flex-wrap gap-1.5">
                  {preferences!.preferredFoods.map((f) => (
                    <span key={f} className="px-2 py-0.5 bg-[#28A745]/10 text-[#28A745] rounded-full text-xs">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(preferences?.dislikedFoods?.length ?? 0) > 0 && (
              <div className="mt-3">
                <p className="text-xs text-slate-400 mb-1.5">Não gosta de</p>
                <div className="flex flex-wrap gap-1.5">
                  {preferences!.dislikedFoods.map((f) => (
                    <span key={f} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Coluna direita */}
        <div className="lg:col-span-8 space-y-6">
          {/* Gamificação — grid-cols-3 sem breakpoint deixava cada card com
              menos de ~25px pra texto num celular (icone 40px + gap ocupavam
              a maior parte da largura da célula), cortando "sequência atual"/
              "XP total"/"maior sequência: N". Empilha em 1 coluna até `sm`
              (640px), onde já cabe confortavelmente em 3. */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Flame size={18} className="text-orange-500" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-800 leading-none">{gamification?.currentStreak ?? 0}</p>
                <p className="text-xs text-slate-400 mt-1">sequência atual</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#007BFF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Star size={18} className="text-[#007BFF]" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-800 leading-none">{gamification?.totalXp ?? 0}</p>
                <p className="text-xs text-slate-400 mt-1">XP total</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#28A745]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trophy size={18} className="text-[#28A745]" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-800 leading-none">Nível {gamification?.level ?? 1}</p>
                <p className="text-xs text-slate-400 mt-1">maior sequência: {gamification?.longestStreak ?? 0}</p>
              </div>
            </div>
          </div>

          <button type="button" onClick={() => setShowStatisticsStory(true)}
            className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-2xl border border-[#007BFF]/20 bg-[#007BFF]/5 px-4 py-3 text-sm font-semibold text-[#007BFF] transition-colors hover:bg-[#007BFF]/10">
            <Share2 size={18} /> Compartilhar estatísticas
          </button>

          {/* Adesão + Antes & Depois */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4">Adesão ao Plano</h3>
              <div className="flex items-center justify-around flex-wrap gap-4">
                <AdherenceRing percentage={adherence.percentage} size={120} />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#007BFF]" />
                    <span className="text-sm text-slate-600 flex-1">Refeições concluídas</span>
                    <span className="text-sm font-bold text-slate-800">
                      {adherence.completed}/{adherence.total}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#28A745]" />
                    <span className="text-sm text-slate-600 flex-1">Planos favoritos</span>
                    <span className="text-sm font-bold text-slate-800">{favoriteCount}</span>
                  </div>
                </div>
              </div>
            </div>

            <BeforeAfterSection currentWeight={currentWeight} />
          </div>

          <ActivitySummaryCard />
          <ActivityGoalsCard />
          <ActivityInsightsCard />

          {/* Registrar novo peso */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <Scale size={16} className="text-[#007BFF] flex-shrink-0" />
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="Registrar peso de hoje (kg)"
                className="min-w-0 flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
              />
              <button
                onClick={() => {
                  const weight = Number(newWeight);
                  if (!newWeight.trim() || Number.isNaN(weight) || weight <= 0) return;
                  addWeightLog.mutate({ weight }, { onSuccess: () => setNewWeight("") });
                }}
                disabled={!newWeight.trim() || Number.isNaN(Number(newWeight)) || addWeightLog.isPending}
                className="bg-[#007BFF] hover:bg-[#0056b3] text-white text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-50 transition-colors"
              >
                {addWeightLog.isPending ? "..." : "Registrar"}
              </button>
            </div>
          </div>

          {/* Gráfico de peso — só se tiver logs */}
          {weightLogs.length > 0 ? (
            <WeightChart weightLogs={weightLogs} startWeight={startWeight} targetWeight={targetWeight} currentWeight={currentWeight} />
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
              <p className="text-5xl mb-4">📊</p>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Registre seu progresso</h3>
              <p className="text-slate-500 mb-6">Registre seu peso para ver seu progresso ao longo do tempo.</p>
            </div>
          )}

          {/* Conquistas */}
          <AchievementsSummaryCard />
        </div>
      </div>

      {showStatisticsStory && (
        <StatisticsStoryModal onClose={() => setShowStatisticsStory(false)}
          weightLogs={weightLogs} startWeight={startWeight} targetWeight={targetWeight}
          currentWeight={currentWeight} displayName={displayName} timezone={socialProfile?.timezone}
          streak={gamification?.currentStreak} />
      )}

      {/* Modal de edição */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        physicalData={physicalData ?? {}}
        preferences={preferences}
        socialProfile={socialProfile}
      />
    </div>
  );
}
