// hooks/useProfile.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";
import type { PhysicalData, UserPreferences } from "@/types/profile";
import { useCommunityMe, useGamificationDetail, useUpdateCommunityProfile } from "@/hooks/useCommunity";

export function useProfile() {
  const { isSignedIn } = useUser();
  const queryClient = useQueryClient();

  // ============================================
  // DADOS FÍSICOS
  // ============================================
  const { data: physicalData, isLoading: physicalLoading } = useQuery({
    queryKey: ["physical-data"],
    queryFn: async () => {
      const response = await fetch("/api/user/physical-data");
      if (!response.ok) throw new Error("Erro ao buscar dados físicos");
      return response.json() as Promise<PhysicalData>;
    },
    enabled: isSignedIn,
  });

  // ============================================
  // PREFERÊNCIAS
  // ============================================
  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ["preferences"],
    queryFn: async () => {
      const response = await fetch("/api/user/preferences");
      if (!response.ok) throw new Error("Erro ao buscar preferências");
      return response.json() as Promise<UserPreferences>;
    },
    enabled: isSignedIn,
  });

  // ============================================
  // IDENTIDADE PÚBLICA (SocialProfile) + GAMIFICAÇÃO
  // Reaproveita os hooks já existentes da Comunidade — não duplica a busca.
  // ============================================
  const { data: meData, isLoading: socialLoading } = useCommunityMe();
  const { data: gamificationDetail, isLoading: gamificationLoading } = useGamificationDetail();

  // ============================================
  // ATUALIZAR DADOS FÍSICOS
  // ============================================
  const updatePhysicalData = useMutation({
    mutationFn: async (data: Partial<PhysicalData>) => {
      const response = await fetch("/api/user/physical-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Erro ao atualizar dados");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["physical-data"] });
      toast.success("Dados atualizados!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // ============================================
  // ATUALIZAR PREFERÊNCIAS
  // ============================================
  const updatePreferences = useMutation({
    mutationFn: async (data: Partial<UserPreferences>) => {
      const response = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Erro ao atualizar preferências");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
      toast.success("Preferências atualizadas!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // ============================================
  // ATUALIZAR IDENTIDADE (displayName/username/bio/avatar) — reaproveita a
  // mesma mutation já usada pela Comunidade, sem endpoint paralelo.
  // ============================================
  const updateIdentity = useUpdateCommunityProfile();

  // ============================================
  // REGISTRAR PESO — rota oficial única: POST /api/weight
  // ============================================
  const addWeightLog = useMutation({
    mutationFn: async (input: { weight: number; notes?: string }) => {
      const response = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Erro ao registrar peso");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weight-logs"] });
      queryClient.invalidateQueries({ queryKey: ["physical-data"] });
      toast.success("Peso registrado!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // ============================================
  // STATUS DO ONBOARDING / PERFIL
  // ============================================
  const isProfileComplete = !!physicalData?.onboardingCompletedAt;

  const missingFields = (() => {
    const missing: string[] = [];
    if (!physicalData?.height) missing.push("altura");
    if (!physicalData?.currentWeight) missing.push("peso atual");
    if (!physicalData?.targetWeight) missing.push("peso meta");
    if (!physicalData?.dietType) missing.push("tipo de dieta");
    if (!physicalData?.cookingLevel) missing.push("nível na cozinha");
    return missing;
  })();

  return {
    // Dados
    physicalData,
    preferences,
    socialProfile: meData?.profile,
    gamification: gamificationDetail ?? meData?.gamification,

    // Status
    physicalLoading,
    preferencesLoading,
    socialLoading,
    gamificationLoading,
    isLoading: physicalLoading || preferencesLoading || socialLoading,

    // Mutations
    updatePhysicalData,
    updatePreferences,
    updateIdentity,
    addWeightLog,

    // Utilitários
    isProfileComplete,
    missingFields,
  };
}
