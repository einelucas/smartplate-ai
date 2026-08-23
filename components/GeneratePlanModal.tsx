// components/GeneratePlanModal.tsx
"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Plus } from "lucide-react";
import { DIET_TYPES, DIET_GOALS, COOKING_LEVELS, BUDGET_LEVELS, ALLERGY_OPTIONS } from "@/lib/profile/options";

export interface GeneratePlanFormData {
  dietType: string;
  dietGoal: string;
  calories?: number; // undefined = calcular automaticamente a partir do Perfil
  cookingLevel: string;
  allergies: string[];
  dislikedFoods: string[];
  preferredFoods: string[];
  maxPrepTime: number;
  budgetLevel: string;
  includeSnacks: boolean;
  additionalNotes: string;
}

// Opções centralizadas em lib/profile/options.ts — reaproveitadas também no
// onboarding e no EditProfileModal, sem listas divergentes.
const dietTypes = DIET_TYPES;
const dietGoals = DIET_GOALS;
const cookingLevels = COOKING_LEVELS;
const budgetLevels = BUDGET_LEVELS;
const commonAllergies = ALLERGY_OPTIONS.map((a) => a.value);

function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput("");
  };

  return (
    <div className="border border-slate-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-[#007BFF]">
      <div className="flex flex-wrap gap-2 mb-1">
        {values.map((tag) => (
          <span key={tag} className="flex items-center gap-1 bg-[#007BFF]/10 text-[#007BFF] text-xs font-medium px-2 py-1 rounded-full">
            {tag}
            <button type="button" onClick={() => onChange(values.filter((v) => v !== tag))}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-2 py-1 text-sm focus:outline-none"
        />
        <button type="button" onClick={addTag} className="text-[#007BFF] p-1 hover:bg-[#007BFF]/10 rounded-lg">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

interface GeneratePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: GeneratePlanFormData) => void;
  isPending: boolean;
}

export default function GeneratePlanModal({ isOpen, onClose, onSubmit, isPending }: GeneratePlanModalProps) {
  const { data: physicalData } = useQuery({
    queryKey: ["physical-data"],
    queryFn: async () => {
      const res = await fetch("/api/user/physical-data");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isOpen,
  });

  const { data: preferences } = useQuery({
    queryKey: ["preferences"],
    queryFn: async () => {
      const res = await fetch("/api/user/preferences");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isOpen,
  });

  const [form, setForm] = useState<GeneratePlanFormData>({
    dietType: "",
    dietGoal: "manter",
    calories: undefined,
    cookingLevel: "",
    allergies: [],
    dislikedFoods: [],
    preferredFoods: [],
    maxPrepTime: 30,
    budgetLevel: "medium",
    includeSnacks: true,
    additionalNotes: "",
  });

  // Pré-preenche com os dados já salvos do usuário quando o modal abre
  useEffect(() => {
    if (!isOpen) return;
    setForm((prev) => ({
      ...prev,
      dietType: physicalData?.dietType || prev.dietType,
      cookingLevel: physicalData?.cookingLevel || prev.cookingLevel,
      dietGoal: preferences?.dietGoal || prev.dietGoal,
      allergies: preferences?.allergies?.length ? preferences.allergies : prev.allergies,
      dislikedFoods: preferences?.dislikedFoods?.length ? preferences.dislikedFoods : prev.dislikedFoods,
      preferredFoods: preferences?.preferredFoods?.length ? preferences.preferredFoods : prev.preferredFoods,
      maxPrepTime: preferences?.maxPrepTime || prev.maxPrepTime,
      budgetLevel: preferences?.budgetLevel || prev.budgetLevel,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, physicalData, preferences]);

  const toggleAllergy = (allergy: string) => {
    setForm((prev) => ({
      ...prev,
      allergies: prev.allergies.includes(allergy) ? prev.allergies.filter((a) => a !== allergy) : [...prev.allergies, allergy],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

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
            className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Sparkles size={20} className="text-[#007BFF]" />
                Gerar Novo Plano
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Dieta e objetivo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Dieta</label>
                  <select
                    value={form.dietType}
                    onChange={(e) => setForm({ ...form, dietType: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                    required
                  >
                    <option value="">Selecione</option>
                    {dietTypes.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Objetivo</label>
                  <select
                    value={form.dietGoal}
                    onChange={(e) => setForm({ ...form, dietGoal: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                  >
                    {dietGoals.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Calorias Diárias</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.calories ?? ""}
                    onChange={(e) => setForm({ ...form, calories: e.target.value === "" ? undefined : Number(e.target.value) })}
                    placeholder="Automático"
                    min={800}
                    max={5000}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                  />
                  <p className="text-xs text-slate-400 mt-1">Deixe em branco para calcular a partir do seu Perfil</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nível na Cozinha</label>
                  <select
                    value={form.cookingLevel}
                    onChange={(e) => setForm({ ...form, cookingLevel: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                  >
                    <option value="">Selecione</option>
                    {cookingLevels.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Alergias */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Alergias / Restrições</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {commonAllergies.map((allergy) => (
                    <button
                      key={allergy}
                      type="button"
                      onClick={() => toggleAllergy(allergy)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                        form.allergies.includes(allergy) ? "border-red-400 bg-red-50 text-red-600" : "border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {allergy}
                    </button>
                  ))}
                </div>
                <TagInput values={form.allergies} onChange={(v) => setForm({ ...form, allergies: v })} placeholder="Outra restrição e Enter" />
              </div>

              {/* Não gosta / prefere */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Não gosta</label>
                  <TagInput values={form.dislikedFoods} onChange={(v) => setForm({ ...form, dislikedFoods: v })} placeholder="Ex: Berinjela" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Favoritos / culinárias</label>
                  <TagInput values={form.preferredFoods} onChange={(v) => setForm({ ...form, preferredFoods: v })} placeholder="Ex: Italiana" />
                </div>
              </div>

              {/* Praticidade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tempo Máx. de Preparo (min)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.maxPrepTime}
                    onChange={(e) => setForm({ ...form, maxPrepTime: Number(e.target.value) })}
                    min={5}
                    max={180}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Orçamento</label>
                  <select
                    value={form.budgetLevel}
                    onChange={(e) => setForm({ ...form, budgetLevel: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                  >
                    {budgetLevels.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeSnacks"
                  checked={form.includeSnacks}
                  onChange={(e) => setForm({ ...form, includeSnacks: e.target.checked })}
                  className="w-5 h-5 accent-[#007BFF] rounded"
                />
                <label htmlFor="includeSnacks" className="text-sm text-slate-700">
                  Incluir lanches no plano
                </label>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Observações adicionais</label>
                <textarea
                  value={form.additionalNotes}
                  onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })}
                  placeholder="Qualquer coisa que a IA deva saber: horários das refeições, ingredientes que você tem em casa, receitas que quer repetir, etc."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007BFF] resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !form.dietType}
                  className="flex-1 py-3 bg-gradient-to-r from-[#007BFF] to-[#28A745] text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    "Gerando..."
                  ) : (
                    <>
                      <Sparkles size={16} /> Gerar Plano
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
