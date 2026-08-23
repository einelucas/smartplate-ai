"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/spinner";
import { motion } from "framer-motion";
import { Camera, Scale, Ruler, Target, LogOut, Edit, Flame, Star, Trophy, Lock } from "lucide-react";
import WeightChart from "@/components/WeightChart";
import AdherenceRing from "@/components/AdherenceRing";
import EditProfileModal from "@/components/EditProfileModal";
import { useProfile } from "@/hooks/useProfile";
import { formatHeightMeters, findLabel, DIET_GOALS, DIET_TYPES, COOKING_LEVELS, BUDGET_LEVELS } from "@/lib/profile/options";

interface WeightLog {
  id: string;
  weight: number;
  date: string;
}

interface MealSlot {
  completed?: boolean;
}

interface PlanDay {
  breakfast: MealSlot | null;
  lunch: MealSlot | null;
  dinner: MealSlot | null;
  snacks: MealSlot[] | null;
}

function calculateAdherence(days: PlanDay[] | undefined): { completed: number; total: number; percentage: number } {
  if (!days || days.length === 0) return { completed: 0, total: 0, percentage: 0 };
  let total = 0;
  let completed = 0;
  for (const day of days) {
    for (const slot of [day.breakfast, day.lunch, day.dinner]) {
      if (slot) {
        total += 1;
        if (slot.completed) completed += 1;
      }
    }
    if (Array.isArray(day.snacks)) {
      for (const snack of day.snacks) {
        if (snack) {
          total += 1;
          if (snack.completed) completed += 1;
        }
      }
    }
  }
  return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

export default function ProfilePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

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
  const adherence = calculateAdherence(latestPlan?.days);
  const favoriteCount = favoritePlansData?.plans?.length ?? 0;

  const formattedWeightLogs = weightLogs.map((log) => ({
    date: new Date(log.date).toLocaleDateString("pt-BR", { month: "short", day: "numeric" }),
    weight: log.weight,
  }));

  const displayName = socialProfile?.displayName || user?.fullName || user?.firstName || "Usuário";
  const avatarUrl = socialProfile?.avatarUrl || user?.imageUrl;

  const achievements = gamification?.achievements ?? [];

  const handleSignOut = () => {
    if (confirm("Deseja realmente sair?")) {
      signOut(() => router.push("/"));
    }
  };

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
        <p className="text-slate-600">Faça login para visualizar seu perfil.</p>
      </div>
    );
  }

  const isLoading = isLoadingWeightLogs || profileHookLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Spinner />
        <span className="ml-2 text-slate-600">Carregando dados...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      <Toaster position="top-center" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna esquerda */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card de identidade */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="relative mb-4">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={displayName} width={96} height={96} className="w-24 h-24 rounded-full object-cover shadow-lg" />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-[#007BFF] to-[#28A745] rounded-full flex items-center justify-center text-3xl text-white shadow-lg">
                    {displayName.charAt(0)}
                  </div>
                )}
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-[#28A745] rounded-full flex items-center justify-center border-2 border-white shadow"
                  title="Alterar foto"
                >
                  <Camera size={14} className="text-white" />
                </button>
              </div>
              <h2 className="text-xl font-bold text-slate-800">{displayName}</h2>
              {socialProfile?.username && <p className="text-slate-400 text-sm">@{socialProfile.username}</p>}
              {socialProfile?.bio && <p className="text-sm text-slate-500 mt-2 max-w-xs">{socialProfile.bio}</p>}
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="mt-4 py-2 px-4 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <Edit size={14} />
                Editar perfil
              </button>
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

          {/* Configurações */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Configurações</h3>
            </div>
            <div className="p-2">
              <button onClick={handleSignOut} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition-colors">
                <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <LogOut size={16} className="text-red-500" />
                </div>
                <span className="text-sm font-medium text-red-500 flex-1 text-left">Sair da conta</span>
              </button>
            </div>
          </div>
        </div>

        {/* Coluna direita */}
        <div className="lg:col-span-8 space-y-6">
          {/* Gamificação */}
          <div className="grid grid-cols-3 gap-3">
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

          {/* Adesão */}
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
                  <span className="text-sm text-slate-600 flex-1">Favoritas</span>
                  <span className="text-sm font-bold text-slate-800">{favoriteCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Registrar novo peso */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <Scale size={16} className="text-[#007BFF] flex-shrink-0" />
              <input
                type="number"
                step="0.1"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="Registrar peso de hoje (kg)"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
              />
              <button
                onClick={() => {
                  addWeightLog.mutate({ weight: parseFloat(newWeight) }, { onSuccess: () => setNewWeight("") });
                }}
                disabled={!newWeight || addWeightLog.isPending}
                className="bg-[#007BFF] hover:bg-[#0056b3] text-white text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-50 transition-colors"
              >
                {addWeightLog.isPending ? "..." : "Registrar"}
              </button>
            </div>
          </div>

          {/* Gráfico de peso — só se tiver logs */}
          {weightLogs.length > 0 ? (
            <WeightChart weightLogs={formattedWeightLogs} startWeight={startWeight} targetWeight={targetWeight} currentWeight={currentWeight} />
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
              <p className="text-5xl mb-4">📊</p>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Registre seu progresso</h3>
              <p className="text-slate-500 mb-6">Registre seu peso para ver seu progresso ao longo do tempo.</p>
            </div>
          )}

          {/* Conquistas */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-slate-800">Conquistas</h3>
              <span className="text-sm text-slate-400">{achievements.length} desbloqueadas</span>
            </div>
            {achievements.length === 0 ? (
              <div className="text-center py-6">
                <Lock className="mx-auto text-slate-300 mb-2" size={28} />
                <p className="text-sm text-slate-500">Complete refeições e mantenha sua sequência para desbloquear conquistas.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                {achievements.map((ach) => (
                  <motion.div
                    key={ach.code}
                    whileHover={{ scale: 1.05 }}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl cursor-default bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200"
                    title={ach.description}
                  >
                    <span className="text-3xl">{ach.emoji}</span>
                    <span className="text-xs text-center font-medium leading-tight text-slate-700">{ach.title}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
