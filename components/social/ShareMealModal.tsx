// components/social/ShareMealModal.tsx
// Único "picker" desta refeição específica (já conhecida pelo chamador) —
// só decide se mostra macros antes de entregar o attachment resolvido pro
// Composer global. Mesmo padrão dos outros pickers (AchievementPickerModal,
// SharePlanModal): nunca publica sozinho.
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share2 } from "lucide-react";
import { useOpenPostComposer } from "./PostComposerProvider";

export default function ShareMealModal({
  mealName,
  calories,
  protein,
  carbs,
  fat,
  ingredients,
  onClose,
}: {
  mealName: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  ingredients?: string[];
  onClose: () => void;
}) {
  const [showMacros, setShowMacros] = useState(false);
  const openComposer = useOpenPostComposer();

  const submit = () => {
    openComposer({
      attachment: { type: "MEAL_ITEM", mealName, calories, protein, carbs, fat, showMacros, ingredients },
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Share2 size={18} className="text-[#28A745]" />
              <h3 className="font-bold text-slate-800">Compartilhar refeição</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <p className={`text-sm text-slate-600 ${ingredients?.length ? "mb-1" : "mb-4"}`}>{mealName}</p>
          {!!ingredients?.length && <p className="text-xs text-slate-400 mb-4">Os ingredientes desta receita vão junto na publicação.</p>}

          <label className="flex items-center gap-2 mb-5 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={showMacros} onChange={(e) => setShowMacros(e.target.checked)} className="accent-[#007BFF]" />
            Mostrar calorias e macros na publicação
          </label>

          <button onClick={submit} className="w-full bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl py-2.5 text-sm font-medium">
            Continuar
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
