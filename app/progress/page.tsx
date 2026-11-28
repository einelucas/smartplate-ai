"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Toaster } from "react-hot-toast";
import { Spinner } from "@/components/spinner";
import { Flame, Star, Trophy } from "lucide-react";
import AdherenceRing from "@/components/AdherenceRing";
import ProgressOverview from "@/components/ProgressOverview";
import ProgressLoading from "./loading";
import styles from "./progress.module.css";
import BeforeAfterSection from "@/components/BeforeAfterSection";
import AchievementsSummaryCard from "@/components/AchievementsSummaryCard";
import ActivitySummaryCard from "@/components/ActivitySummaryCard";
import ActivityGoalsCard from "@/components/ActivityGoalsCard";
import ActivityInsightsCard from "@/components/ActivityInsightsCard";
import { useProfile } from "@/hooks/useProfile";
import { calculateMealAdherence } from "@/lib/mealplan";

const StatisticsStoryModal = dynamic(() => import("@/components/StatisticsStoryModal"), { ssr: false });

interface WeightLog {
  id: string;
  weight: number;
  date: string;
}

export default function ProgressPage() {
  const { isLoaded, isSignedIn, user } = useUser();

  const {
    physicalData,
    socialProfile,
    gamification,
    isLoading: profileHookLoading,
    addWeightLog,
  } = useProfile();

  const [showStatisticsStory, setShowStatisticsStory] = useState(false);

  const { data: weightLogs = [], isLoading: isLoadingWeightLogs, isError: weightError } = useQuery<WeightLog[]>({
    queryKey: ["weight-logs"],
    queryFn: async () => {
      const res = await fetch("/api/weight-logs");
      if (!res.ok) throw new Error("Não foi possível carregar os pesos");
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.logs)) return data.logs;
      return [];
    },
    enabled: !!isSignedIn,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
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
    return <ProgressLoading />;
  }

  return (
    <div className={styles.screen}>
      <Toaster position="top-center" />
      <ProgressOverview logs={weightLogs} currentWeight={currentWeight} startWeight={startWeight} targetWeight={targetWeight} timezone={socialProfile?.timezone} error={weightError} pending={addWeightLog.isPending} onShare={() => setShowStatisticsStory(true)} onRegister={(weight, onSuccess) => addWeightLog.mutate({ weight }, { onSuccess })} />

      <div className={styles.extras}>
        <h2 className={styles.sectionTitle}>Mais sobre seu progresso</h2>
        {/* Coluna direita */}
        <div className={styles.extraGroup}>
          {/* Gamificação — grid-cols-3 sem breakpoint deixava cada card com
              menos de ~25px pra texto num celular (icone 40px + gap ocupavam
              a maior parte da largura da célula), cortando "sequência atual"/
              "XP total"/"maior sequência: N". Empilha em 1 coluna até `sm`
              (640px), onde já cabe confortavelmente em 3. */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="hidden sm:flex w-9 h-9 bg-[#f1f7fa] rounded-xl items-center justify-center flex-shrink-0">
                <Flame size={18} className="text-orange-500" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-800 leading-none">{gamification?.currentStreak ?? 0}</p>
                <p className="text-xs text-slate-400 mt-1">sequência atual</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="hidden sm:flex w-9 h-9 bg-[#f1f7fa] rounded-xl items-center justify-center flex-shrink-0">
                <Star size={18} className="text-[#007BFF]" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-800 leading-none">{gamification?.totalXp ?? 0}</p>
                <p className="text-xs text-slate-400 mt-1">XP total</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="hidden sm:flex w-9 h-9 bg-[#f1f7fa] rounded-xl items-center justify-center flex-shrink-0">
                <Trophy size={18} className="text-[#28A745]" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-800 leading-none">Nível {gamification?.level ?? 1}</p>
                <p className="text-xs text-slate-400 mt-1">maior sequência: {gamification?.longestStreak ?? 0}</p>
              </div>
            </div>
          </div>


          {/* Adesão + Antes & Depois */}
          <div className={styles.extraGroup}>
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

    </div>
  );
}
