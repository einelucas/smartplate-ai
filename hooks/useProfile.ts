// hooks/useProfile.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";
import type {
  PhysicalData,
  UserPreferences,
  UserProfile,
} from "@/types/profile";

export function useProfile() {
  const { isSignedIn } = useUser();
  const queryClient = useQueryClient();

  // ============================================
  // BUSCAR DADOS FÍSICOS
  // ============================================
  const { data: physicalData, isLoading: physicalLoading } = useQuery({
    queryKey: ["physical-data"],
    queryFn: async () => {
      const response = await fetch("/api/user/physical-data");
      if (!response.ok) {
        throw new Error("Erro ao buscar dados físicos");
      }
      return response.json() as Promise<PhysicalData>;
    },
    enabled: isSignedIn,
  });

  // ============================================
  // BUSCAR PREFERÊNCIAS
  // ============================================
  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ["preferences"],
    queryFn: async () => {
      const response = await fetch("/api/user/preferences");
      if (!response.ok) {
        throw new Error("Erro ao buscar preferências");
      }
      return response.json() as Promise<UserPreferences>;
    },
    enabled: isSignedIn,
  });

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
        throw new Error("Erro ao atualizar dados");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["physical-data"] });
      toast.success("Dados atualizados!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
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
        throw new Error("Erro ao atualizar preferências");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
      toast.success("Preferências atualizadas!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // ============================================
  // REGISTRAR PESO
  // ============================================
  const addWeightLog = useMutation({
    mutationFn: async (weight: number) => {
      const response = await fetch("/api/weight-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight }),
      });

      if (!response.ok) {
        throw new Error("Erro ao registrar peso");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weight-logs"] });
      queryClient.invalidateQueries({ queryKey: ["physical-data"] });
      toast.success("Peso registrado!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // ============================================
  // VERIFICAR SE PERFIL ESTÁ COMPLETO
  // ============================================
  const isProfileComplete = () => {
    if (!physicalData || !preferences) return false;

    return !!(
      physicalData.height &&
      physicalData.currentWeight &&
      physicalData.targetWeight &&
      physicalData.dietType &&
      physicalData.cookingLevel
    );
  };

  // ============================================
  // OBTER CAMPOS FALTANTES
  // ============================================
  const getMissingFields = () => {
    const missing: string[] = [];

    if (!physicalData?.height) missing.push("altura");
    if (!physicalData?.currentWeight) missing.push("peso atual");
    if (!physicalData?.targetWeight) missing.push("peso meta");
    if (!physicalData?.dietType) missing.push("tipo de dieta");
    if (!physicalData?.cookingLevel) missing.push("nível na cozinha");

    return missing;
  };

  return {
    // Dados
    physicalData,
    preferences,

    // Status
    physicalLoading,
    preferencesLoading,
    isLoading: physicalLoading || preferencesLoading,

    // Métodos
    updatePhysicalData,
    updatePreferences,
    addWeightLog,

    // Utilitários
    isProfileComplete: isProfileComplete(),
    missingFields: getMissingFields(),
  };
}
