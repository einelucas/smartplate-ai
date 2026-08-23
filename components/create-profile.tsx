// components/CreateProfileOnSignIn.tsx

"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import OnboardingWizard from "./OnboardingWizard";

type ApiResponse = {
  message: string;
  error?: string;
};

export default function CreateProfileOnSignIn() {
  const { isLoaded, isSignedIn } = useUser();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);

  // Garante que o Profile exista no banco assim que o usuário loga
  const { mutate, isPending, isSuccess } = useMutation<ApiResponse, Error>({
    mutationFn: async () => {
      const res = await fetch("/api/create-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao criar perfil");
      }
      return data as ApiResponse;
    },
    onError: (error) => {
      console.error("Error creating profile:", error);
    },
  });

  useEffect(() => {
    if (isLoaded && isSignedIn && !isPending) {
      mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  // Só depois do profile existir, verifica se já completou o onboarding
  const { data: physicalData, isLoading } = useQuery({
    queryKey: ["physical-data"],
    queryFn: async () => {
      const res = await fetch("/api/user/physical-data");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!isSignedIn && isSuccess,
  });

  const needsOnboarding = !!isSignedIn && isSuccess && !isLoading && !dismissed && !physicalData?.onboardingCompletedAt;

  if (!needsOnboarding) return null;

  return (
    <OnboardingWizard
      onComplete={() => {
        setDismissed(true);
        queryClient.invalidateQueries({ queryKey: ["physical-data"] });
      }}
    />
  );
}
