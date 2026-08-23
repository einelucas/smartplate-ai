// components/OnboardingWizard.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Leaf,
  Apple,
  Fish,
  Wheat,
  Milk,
  Egg,
  Heart,
  Camera,
  Loader2,
  X,
  Plus,
  AtSign,
} from "lucide-react";
import {
  DIET_TYPES,
  ALLERGY_OPTIONS,
  FOOD_SUGGESTION_OPTIONS,
  COOKING_LEVELS,
  DIET_GOALS,
  BUDGET_LEVELS,
  MAX_PREP_TIME_OPTIONS,
} from "@/lib/profile/options";
import { useProfile } from "@/hooks/useProfile";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const allergyIcons: Record<string, typeof Wheat> = {
  "Glúten": Wheat,
  "Lactose": Milk,
  "Ovos": Egg,
  "Frutos do mar": Fish,
  "Amendoim": Apple,
  "Soja": Leaf,
};

function TagPicker({
  suggestions,
  selected,
  onToggle,
  onAddCustom,
  onRemove,
  placeholder,
}: {
  suggestions: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  onAddCustom: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder: string;
}) {
  const [customValue, setCustomValue] = useState("");

  const submitCustom = () => {
    const trimmed = customValue.trim();
    if (!trimmed) return;
    onAddCustom(trimmed);
    setCustomValue("");
  };

  const customTags = selected.filter((s) => !suggestions.includes(s));

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {suggestions.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
                isSelected ? "border-[#28A745] bg-[#28A745]/10 text-[#28A745]" : "border-slate-200 text-slate-600 bg-white"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {customTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {customTags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-[#007BFF]/10 text-[#007BFF]">
              {tag}
              <button type="button" onClick={() => onRemove(tag)}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value.slice(0, 40))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitCustom();
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
        />
        <button
          type="button"
          onClick={submitCustom}
          className="w-10 h-10 flex-shrink-0 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center text-slate-600"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { physicalData, preferences, socialProfile, updateIdentity } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [step, setStep] = useState(0);
  const [prefilled, setPrefilled] = useState(false);

  // Etapa 1 — Identidade
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  // Etapa 2 — Objetivo e dados físicos
  const [dietGoal, setDietGoal] = useState("");
  const [height, setHeight] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");

  // Etapa 3 — Alimentação
  const [dietType, setDietType] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);

  // Etapa 4 — Gostos
  const [preferredFoods, setPreferredFoods] = useState<string[]>([]);
  const [dislikedFoods, setDislikedFoods] = useState<string[]>([]);

  // Etapa 5 — Rotina
  const [cookingLevel, setCookingLevel] = useState("");
  const [maxPrepTime, setMaxPrepTime] = useState<number | null>(null);
  const [budgetLevel, setBudgetLevel] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Pré-preenche com dados existentes (uma única vez) — nunca sobrescreve com vazio.
  useEffect(() => {
    if (prefilled) return;
    if (!socialProfile && !physicalData && !preferences) return;

    if (socialProfile) {
      setDisplayName(socialProfile.displayName?.startsWith("Usuário SmartPlate") ? user?.fullName || "" : socialProfile.displayName || user?.fullName || "");
      setUsername(/^user_[a-z0-9]+$/.test(socialProfile.username || "") ? "" : socialProfile.username || "");
      setBio(socialProfile.bio || "");
    } else if (user?.fullName) {
      setDisplayName(user.fullName);
    }

    if (physicalData) {
      if (physicalData.height) setHeight(String(physicalData.height));
      if (physicalData.currentWeight) setCurrentWeight(String(physicalData.currentWeight));
      if (physicalData.targetWeight) setTargetWeight(String(physicalData.targetWeight));
      if (physicalData.dietType) setDietType(physicalData.dietType);
      if (physicalData.cookingLevel) setCookingLevel(physicalData.cookingLevel);
    }

    if (preferences) {
      if (preferences.allergies?.length) setAllergies(preferences.allergies);
      if (preferences.preferredFoods?.length) setPreferredFoods(preferences.preferredFoods);
      if (preferences.dislikedFoods?.length) setDislikedFoods(preferences.dislikedFoods);
      if (preferences.dietGoal) setDietGoal(preferences.dietGoal);
      if (preferences.maxPrepTime !== undefined && preferences.maxPrepTime !== null) setMaxPrepTime(preferences.maxPrepTime);
      if (preferences.budgetLevel) setBudgetLevel(preferences.budgetLevel);
      if (preferences.additionalNotes) setAdditionalNotes(preferences.additionalNotes);
    }

    setPrefilled(true);
  }, [physicalData, preferences, socialProfile, prefilled, user]);

  // Disponibilidade do @username (debounce)
  const debouncedUsername = useDebouncedValue(username.trim().toLowerCase(), 500);
  const [availability, setAvailability] = useState<{ available: boolean; reason: string | null } | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    if (debouncedUsername.length < 3) {
      setAvailability(null);
      return;
    }
    if (socialProfile?.username && debouncedUsername === socialProfile.username) {
      setAvailability({ available: true, reason: null });
      return;
    }
    let cancelled = false;
    setCheckingUsername(true);
    fetch(`/api/profile/username-availability?username=${encodeURIComponent(debouncedUsername)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setAvailability(data);
      })
      .catch(() => {
        if (!cancelled) setAvailability(null);
      })
      .finally(() => {
        if (!cancelled) setCheckingUsername(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedUsername, socialProfile?.username]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }
    setUploadingPhoto(true);
    try {
      await user.setProfileImage({ file });
      await user.reload();
      updateIdentity.mutate({ avatarUrl: user.imageUrl });
      toast.success("Foto atualizada!");
    } catch {
      toast.error("Erro ao enviar foto");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  }, []);

  const completeOnboarding = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          username: username.trim().toLowerCase(),
          bio: bio.trim() || undefined,
          timezone,
          height: Number(height),
          currentWeight: Number(currentWeight),
          targetWeight: Number(targetWeight),
          dietGoal,
          dietType,
          allergies,
          preferredFoods,
          dislikedFoods,
          cookingLevel,
          maxPrepTime,
          budgetLevel,
          additionalNotes: additionalNotes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.error || "Erro ao concluir onboarding");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["physical-data"] });
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
      queryClient.invalidateQueries({ queryKey: ["community", "me"] });
      toast.success("Perfil configurado com sucesso!");
      onComplete();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleAllergy = (id: string) => setAllergies((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const steps = [
    {
      title: "Como podemos te chamar?",
      subtitle: "Essa é sua identidade pública no SmartPlate",
      content: (
        <div className="space-y-5">
          <div className="flex flex-col items-center">
            <div className="relative mb-2">
              {user?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.imageUrl} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-slate-100" />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-[#007BFF] to-[#28A745] rounded-full flex items-center justify-center text-2xl text-white">
                  {displayName?.charAt(0) || "👤"}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 w-7 h-7 bg-[#28A745] rounded-full flex items-center justify-center border-2 border-white"
              >
                {uploadingPhoto ? <Loader2 size={12} className="text-white animate-spin" /> : <Camera size={12} className="text-white" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </div>
            <span className="text-xs text-slate-400">Foto opcional</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Nome</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 40))}
              placeholder="Seu nome"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Nome de usuário (@)</label>
            <div className="relative">
              <AtSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 24))}
                placeholder="seu_usuario"
                className="w-full pl-9 pr-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
              />
            </div>
            {username.length >= 3 && (
              <p className={`text-xs mt-1.5 ${checkingUsername ? "text-slate-400" : availability?.available ? "text-[#28A745]" : "text-red-500"}`}>
                {checkingUsername
                  ? "Verificando..."
                  : availability?.available
                    ? "Disponível"
                    : availability?.reason === "reserved"
                      ? "Este nome não está disponível"
                      : availability?.reason === "taken"
                        ? "Já está em uso"
                        : availability
                          ? "Nome de usuário inválido"
                          : ""}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Bio (opcional)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 280))}
              placeholder="Conte um pouco sobre você"
              rows={2}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF] resize-none"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Qual seu objetivo?",
      subtitle: "E alguns dados para calcular seu plano ideal",
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3">
            {DIET_GOALS.map((goal) => (
              <motion.button
                key={goal.value}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => setDietGoal(goal.value)}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  dietGoal === goal.value ? "border-[#007BFF] bg-[#007BFF]/10" : "border-slate-200 bg-white"
                }`}
              >
                <span className="font-semibold text-slate-800">{goal.label}</span>
              </motion.button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Altura (cm)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="175"
                className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Peso atual (kg)</label>
              <input
                type="number"
                step="0.1"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
                placeholder="80"
                className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Peso meta (kg)</label>
              <input
                type="number"
                step="0.1"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder="75"
                className="w-full px-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Qual seu tipo de dieta?",
      subtitle: "Escolha a que mais combina com você",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {DIET_TYPES.map((diet) => (
              <motion.button
                key={diet.value}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setDietType(diet.value)}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  dietType === diet.value ? "border-[#007BFF] bg-[#007BFF]/10" : "border-slate-200 bg-white"
                }`}
              >
                <span className="text-2xl">{diet.icon}</span>
                <h4 className="font-semibold text-slate-800 mt-2">{diet.label}</h4>
                <p className="text-xs text-slate-500 mt-1">{diet.desc}</p>
              </motion.button>
            ))}
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Alguma alergia ou restrição?</p>
            <div className="grid grid-cols-3 gap-3">
              {ALLERGY_OPTIONS.map((allergy) => {
                const Icon = allergyIcons[allergy.value] ?? Leaf;
                const isSelected = allergies.includes(allergy.value);
                return (
                  <motion.button
                    key={allergy.value}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleAllergy(allergy.value)}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center transition-all ${
                      isSelected ? "border-red-400 bg-red-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    <Icon size={24} className={isSelected ? "text-red-500" : "text-slate-400"} />
                    <span className={`text-xs mt-2 font-medium ${isSelected ? "text-red-600" : "text-slate-600"}`}>{allergy.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "O que você gosta de comer?",
      subtitle: "Selecione ou digite suas preferências",
      content: (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Gosto de</p>
            <TagPicker
              suggestions={FOOD_SUGGESTION_OPTIONS}
              selected={preferredFoods}
              onToggle={(v) => setPreferredFoods((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))}
              onAddCustom={(v) => setPreferredFoods((prev) => (prev.includes(v) ? prev : [...prev, v]))}
              onRemove={(v) => setPreferredFoods((prev) => prev.filter((x) => x !== v))}
              placeholder="Adicionar outro..."
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Não gosto de</p>
            <TagPicker
              suggestions={FOOD_SUGGESTION_OPTIONS}
              selected={dislikedFoods}
              onToggle={(v) => setDislikedFoods((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))}
              onAddCustom={(v) => setDislikedFoods((prev) => (prev.includes(v) ? prev : [...prev, v]))}
              onRemove={(v) => setDislikedFoods((prev) => prev.filter((x) => x !== v))}
              placeholder="Adicionar outro..."
            />
          </div>
        </div>
      ),
    },
    {
      title: "Sua rotina na cozinha",
      subtitle: "Últimos detalhes para personalizar seus planos",
      content: (
        <div className="space-y-6">
          <div className="space-y-3">
            {COOKING_LEVELS.map((level) => (
              <motion.button
                key={level.value}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => setCookingLevel(level.value)}
                className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${
                  cookingLevel === level.value ? "border-[#007BFF] bg-[#007BFF]/10" : "border-slate-200 bg-white"
                }`}
              >
                <span className="text-3xl">{level.emoji}</span>
                <div className="text-left">
                  <h4 className="font-semibold text-slate-800">{level.label}</h4>
                  <p className="text-sm text-slate-500">{level.desc}</p>
                </div>
                {cookingLevel === level.value && <Check size={20} className="text-[#007BFF] ml-auto" />}
              </motion.button>
            ))}
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Tempo máximo de preparo</p>
            <div className="flex flex-wrap gap-2">
              {MAX_PREP_TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setMaxPrepTime(opt.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors ${
                    maxPrepTime === opt.value ? "border-[#007BFF] bg-[#007BFF]/10 text-[#007BFF]" : "border-slate-200 text-slate-600 bg-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Orçamento</p>
            <div className="grid grid-cols-3 gap-3">
              {BUDGET_LEVELS.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => setBudgetLevel(b.value)}
                  className={`p-3 rounded-2xl border-2 text-sm font-medium transition-colors ${
                    budgetLevel === b.value ? "border-[#28A745] bg-[#28A745]/10 text-[#28A745]" : "border-slate-200 text-slate-600 bg-white"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Observações (opcional)</label>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value.slice(0, 500))}
              placeholder="Algo mais que devemos saber?"
              rows={2}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF] resize-none"
            />
          </div>
        </div>
      ),
    },
  ];

  const canProceed = () => {
    switch (step) {
      case 0:
        return displayName.trim().length > 0 && username.trim().length >= 3 && availability?.available !== false;
      case 1:
        return !!dietGoal && Number(height) > 0 && Number(currentWeight) > 0 && Number(targetWeight) > 0;
      case 2:
        return !!dietType;
      case 3:
        return true;
      case 4:
        return !!cookingLevel && !!budgetLevel;
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
      <div className="px-6 pt-8 mb-6 max-w-lg w-full mx-auto">
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? "bg-[#007BFF]" : "bg-slate-200"}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 px-6 overflow-auto max-w-lg w-full mx-auto pb-6">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{steps[step].title}</h2>
            <p className="text-slate-500 mb-6">{steps[step].subtitle}</p>
            {steps[step].content}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-6 bg-white border-t border-slate-100">
        <div className="flex gap-3 max-w-lg w-full mx-auto">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="h-12 px-6 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={() => (step < steps.length - 1 ? setStep(step + 1) : completeOnboarding.mutate())}
            disabled={!canProceed() || completeOnboarding.isPending}
            className="flex-1 h-12 bg-[#007BFF] hover:bg-[#0056b3] rounded-xl text-base font-semibold text-white disabled:opacity-50 transition-colors flex items-center justify-center"
          >
            {step < steps.length - 1 ? (
              <>
                Continuar
                <ChevronRight size={18} className="ml-2" />
              </>
            ) : completeOnboarding.isPending ? (
              "Salvando..."
            ) : (
              <>
                Começar
                <Heart size={18} className="ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
