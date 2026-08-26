"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Scale, Target, ChefHat, Save, Upload, Loader, User as UserIcon, AtSign } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";
import { useProfile } from "@/hooks/useProfile";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { DIET_TYPES, ALLERGY_OPTIONS, FOOD_SUGGESTION_OPTIONS, COOKING_LEVELS, DIET_GOALS, BUDGET_LEVELS, MAX_PREP_TIME_OPTIONS, ACTIVITY_LEVELS } from "@/lib/profile/options";
import type { PhysicalData, SocialProfileSummary, UserPreferences } from "@/types/profile";
import Avatar from "@/components/social/Avatar";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  physicalData: PhysicalData;
  preferences?: UserPreferences;
  socialProfile?: SocialProfileSummary;
  initialTab?: Tab;
}

type Tab = "identidade" | "dados" | "preferencias";

export default function EditProfileModal({ isOpen, onClose, physicalData, preferences, socialProfile, initialTab = "identidade" }: EditProfileModalProps) {
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updatePhysicalData, updatePreferences, updateIdentity } = useProfile();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [displayName, setDisplayName] = useState(socialProfile?.displayName ?? "");
  const [username, setUsername] = useState(socialProfile?.username ?? "");
  const [bio, setBio] = useState(socialProfile?.bio ?? "");

  const [height, setHeight] = useState(String(physicalData?.height ?? ""));
  const [targetWeight, setTargetWeight] = useState(String(physicalData?.targetWeight ?? ""));
  const [dietGoal, setDietGoal] = useState(preferences?.dietGoal ?? "");
  const [birthDate, setBirthDate] = useState(physicalData?.birthDate ? physicalData.birthDate.slice(0, 10) : "");
  const [activityLevel, setActivityLevel] = useState(physicalData?.activityLevel ?? "");

  const [dietType, setDietType] = useState(physicalData?.dietType ?? "");
  const [allergies, setAllergies] = useState<string[]>(preferences?.allergies ?? []);
  const [preferredFoods, setPreferredFoods] = useState<string[]>(preferences?.preferredFoods ?? []);
  const [dislikedFoods, setDislikedFoods] = useState<string[]>(preferences?.dislikedFoods ?? []);
  const [cookingLevel, setCookingLevel] = useState(physicalData?.cookingLevel ?? "");
  const [maxPrepTime, setMaxPrepTime] = useState<number | null>(preferences?.maxPrepTime ?? null);
  const [budgetLevel, setBudgetLevel] = useState(preferences?.budgetLevel ?? "");
  const [additionalNotes, setAdditionalNotes] = useState(preferences?.additionalNotes ?? "");

  useEffect(() => {
    if (!isOpen) return;
    setTab(initialTab);
    setDisplayName(socialProfile?.displayName ?? "");
    setUsername(socialProfile?.username ?? "");
    setBio(socialProfile?.bio ?? "");
    setHeight(String(physicalData?.height ?? ""));
    setTargetWeight(String(physicalData?.targetWeight ?? ""));
    setDietGoal(preferences?.dietGoal ?? "");
    setBirthDate(physicalData?.birthDate ? physicalData.birthDate.slice(0, 10) : "");
    setActivityLevel(physicalData?.activityLevel ?? "");
    setDietType(physicalData?.dietType ?? "");
    setAllergies(preferences?.allergies ?? []);
    setPreferredFoods(preferences?.preferredFoods ?? []);
    setDislikedFoods(preferences?.dislikedFoods ?? []);
    setCookingLevel(physicalData?.cookingLevel ?? "");
    setMaxPrepTime(preferences?.maxPrepTime ?? null);
    setBudgetLevel(preferences?.budgetLevel ?? "");
    setAdditionalNotes(preferences?.additionalNotes ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const debouncedUsername = useDebouncedValue(username.trim().toLowerCase(), 500);
  const [availability, setAvailability] = useState<{ available: boolean; reason: string | null } | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    if (!isOpen || debouncedUsername.length < 3) {
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
      .then((data) => !cancelled && setAvailability(data))
      .catch(() => !cancelled && setAvailability(null))
      .finally(() => !cancelled && setCheckingUsername(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedUsername, socialProfile?.username, isOpen]);

  const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || uploadingImage) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Envie uma imagem JPEG, PNG ou WebP");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploadingImage(true);
    try {
      // Usa a URL retornada diretamente pelo upload (nunca user.imageUrl após
      // um reload() — evita depender de timing de propagação do lado do
      // Clerk) e só considera concluído depois que o banco confirmar.
      const image = await user.setProfileImage({ file });
      if (!image.publicUrl) throw new Error("Upload sem URL retornada");
      await updateIdentity.mutateAsync({ customAvatarUrl: image.publicUrl });
      toast.success("Foto atualizada!");
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao atualizar foto");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    if (!user || uploadingImage) return;
    setUploadingImage(true);
    try {
      await user.setProfileImage({ file: null });
      await updateIdentity.mutateAsync({ customAvatarUrl: null });
      toast.success("Foto personalizada removida");
    } catch (error) {
      console.error("Erro ao remover foto:", error);
      toast.error("Erro ao remover foto");
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleAllergy = (id: string) => setAllergies((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  const togglePreferred = (id: string) => setPreferredFoods((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  const toggleDisliked = (id: string) => setDislikedFoods((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const isSaving = updatePhysicalData.isPending || updatePreferences.isPending || updateIdentity.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (username.trim().length >= 3 && availability?.available === false) {
      toast.error("Escolha um nome de usuário disponível antes de salvar");
      return;
    }

    try {
      const identityPatch: Record<string, unknown> = {};
      if (displayName.trim() && displayName.trim() !== socialProfile?.displayName) identityPatch.displayName = displayName.trim();
      if (username.trim() && username.trim().toLowerCase() !== socialProfile?.username) identityPatch.username = username.trim().toLowerCase();
      if (bio !== (socialProfile?.bio ?? "")) identityPatch.bio = bio.trim() || null;
      if (Object.keys(identityPatch).length > 0) {
        await updateIdentity.mutateAsync(identityPatch);
      }

      await updatePhysicalData.mutateAsync({
        height: height ? Number(height) : undefined,
        targetWeight: targetWeight ? Number(targetWeight) : undefined,
        dietType: dietType || undefined,
        cookingLevel: cookingLevel || undefined,
        birthDate: birthDate || undefined,
        activityLevel: activityLevel || undefined,
      });

      await updatePreferences.mutateAsync({
        allergies,
        preferredFoods,
        dislikedFoods,
        maxPrepTime,
        budgetLevel: (budgetLevel || undefined) as UserPreferences["budgetLevel"],
        dietGoal: (dietGoal || undefined) as UserPreferences["dietGoal"],
        additionalNotes: additionalNotes.trim() || null,
      });

      toast.success("Perfil atualizado com sucesso!");
      onClose();
    } catch {
      // erros já são exibidos via toast pelas próprias mutations
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof UserIcon }[] = [
    { id: "identidade", label: "Identidade", icon: UserIcon },
    { id: "dados", label: "Dados", icon: Scale },
    { id: "preferencias", label: "Preferências", icon: ChefHat },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800">Editar Perfil</h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="flex px-6 pt-4 gap-1 border-b border-slate-100 sticky top-[73px] bg-white z-10">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    tab === t.id ? "border-[#007BFF] text-[#007BFF]" : "border-transparent text-slate-400"
                  }`}
                >
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {tab === "identidade" && (
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar
                        avatarUrl={socialProfile?.avatarUrl}
                        name={user?.firstName || "U"}
                        sizeClassName="w-20 h-20 border-4 border-slate-100"
                        textSizeClassName="text-3xl"
                        fallbackClassName="bg-gradient-to-br from-[#007BFF] to-[#28A745] text-white"
                      />
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <Loader size={24} className="text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="flex-1 py-2 px-4 border-2 border-dashed border-[#007BFF]/30 rounded-xl text-sm font-medium text-[#007BFF] hover:bg-[#007BFF]/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <Upload size={16} />
                          {uploadingImage ? "Enviando..." : "Trocar foto"}
                        </button>
                        {socialProfile?.hasCustomAvatar && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            disabled={uploadingImage}
                            title="Remover foto personalizada"
                            aria-label="Remover foto personalizada"
                            className="px-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-2">Formatos: JPG, PNG, WebP • Máx 5MB</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Nome</label>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value.slice(0, 40))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Nome de usuário</label>
                    <div className="relative">
                      <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 24))}
                        className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                      />
                    </div>
                    {username.length >= 3 && (
                      <p className={`text-xs mt-1 ${checkingUsername ? "text-slate-400" : availability?.available ? "text-[#28A745]" : "text-red-500"}`}>
                        {checkingUsername ? "Verificando..." : availability?.available ? "Disponível" : availability ? "Indisponível" : ""}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value.slice(0, 280))}
                      rows={2}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF] resize-none"
                    />
                  </div>
                </div>
              )}

              {tab === "dados" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Altura (cm)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="175"
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Peso Meta (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        inputMode="decimal"
                        value={targetWeight}
                        onChange={(e) => setTargetWeight(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                      <Target size={12} /> Objetivo
                    </label>
                    <select
                      value={dietGoal}
                      onChange={(e) => setDietGoal(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                    >
                      <option value="">Selecione</option>
                      {DIET_GOALS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Data de nascimento</label>
                    <input
                      type="date"
                      value={birthDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Nível de atividade</label>
                    <select
                      value={activityLevel}
                      onChange={(e) => setActivityLevel(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                    >
                      <option value="">Selecione</option>
                      {ACTIVITY_LEVELS.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-400 mt-1">Usados só para calcular sua meta calórica — nunca são públicos.</p>
                  </div>

                  <p className="text-xs text-slate-400">
                    Para alterar seu peso atual, use o registro de peso na aba Perfil — assim seu histórico fica correto.
                  </p>
                </div>
              )}

              {tab === "preferencias" && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Tipo de Dieta</label>
                    <select
                      value={dietType}
                      onChange={(e) => setDietType(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                    >
                      <option value="">Selecione</option>
                      {DIET_TYPES.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-2">Alergias / restrições</p>
                    <div className="flex flex-wrap gap-2">
                      {ALLERGY_OPTIONS.map((a) => (
                        <button
                          key={a.value}
                          type="button"
                          onClick={() => toggleAllergy(a.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 ${
                            allergies.includes(a.value) ? "border-red-400 bg-red-50 text-red-600" : "border-slate-200 text-slate-600"
                          }`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-2">Gosto de</p>
                    <div className="flex flex-wrap gap-2">
                      {FOOD_SUGGESTION_OPTIONS.map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => togglePreferred(f)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 ${
                            preferredFoods.includes(f) ? "border-[#28A745] bg-[#28A745]/10 text-[#28A745]" : "border-slate-200 text-slate-600"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-2">Não gosto de</p>
                    <div className="flex flex-wrap gap-2">
                      {FOOD_SUGGESTION_OPTIONS.map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => toggleDisliked(f)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 ${
                            dislikedFoods.includes(f) ? "border-slate-400 bg-slate-100 text-slate-700" : "border-slate-200 text-slate-600"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Nível na Cozinha</label>
                    <select
                      value={cookingLevel}
                      onChange={(e) => setCookingLevel(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                    >
                      <option value="">Selecione</option>
                      {COOKING_LEVELS.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-2">Tempo máximo de preparo</p>
                    <div className="flex flex-wrap gap-2">
                      {MAX_PREP_TIME_OPTIONS.map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setMaxPrepTime(opt.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 ${
                            maxPrepTime === opt.value ? "border-[#007BFF] bg-[#007BFF]/10 text-[#007BFF]" : "border-slate-200 text-slate-600"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Orçamento</label>
                    <div className="grid grid-cols-3 gap-2">
                      {BUDGET_LEVELS.map((b) => (
                        <button
                          key={b.value}
                          type="button"
                          onClick={() => setBudgetLevel(b.value)}
                          className={`p-2 rounded-xl border-2 text-xs font-medium ${
                            budgetLevel === b.value ? "border-[#28A745] bg-[#28A745]/10 text-[#28A745]" : "border-slate-200 text-slate-600"
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Observações</label>
                    <textarea
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value.slice(0, 500))}
                      rows={2}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF] resize-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2 sticky bottom-0 bg-white">
                <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-gradient-to-r from-[#007BFF] to-[#28A745] text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? "Salvando..." : (
                    <>
                      <Save size={16} />
                      Salvar
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
