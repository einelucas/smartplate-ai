// components/social/CommunityHeader.tsx
"use client";

import { motion } from "framer-motion";
import { Flame, Star, Trophy } from "lucide-react";
import { useCommunityMe } from "@/hooks/useCommunity";

/** Sem formatter compacto pré-existente no projeto — números grandes de XP nunca podem ser cortados (ex.: 12850 -> "12,9 mil"). */
function formatXp(value: number): string {
  if (value < 10000) return value.toLocaleString("pt-BR");
  if (value < 1000000) return `${(value / 1000).toFixed(1).replace(".", ",")} mil`;
  return `${(value / 1000000).toFixed(1).replace(".", ",")} mi`;
}

export default function CommunityHeader() {
  const { data, isLoading } = useCommunityMe();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[84px] bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  const gamification = data?.gamification;
  const streak = gamification?.currentStreak ?? 0;

  const cards = [
    {
      icon: Flame,
      color: "text-orange-500",
      bg: "bg-orange-50",
      value: `${streak} ${streak === 1 ? "dia" : "dias"}`,
      label: "Sequência",
    },
    {
      icon: Star,
      color: "text-[#007BFF]",
      bg: "bg-[#007BFF]/10",
      value: formatXp(gamification?.totalXp ?? 0),
      label: "XP",
    },
    {
      icon: Trophy,
      color: "text-[#28A745]",
      bg: "bg-[#28A745]/10",
      value: `Nível ${gamification?.level ?? 1}`,
      label: `${gamification?.achievementsCount ?? 0} conquistas`,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="min-w-0 bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-100 flex flex-col items-start"
        >
          <div className={`w-9 h-9 sm:w-11 sm:h-11 ${card.bg} rounded-xl flex items-center justify-center flex-shrink-0 mb-2`}>
            <card.icon size={18} className={card.color} />
          </div>
          <p className="w-full text-base sm:text-xl font-bold text-slate-800 leading-tight break-words">{card.value}</p>
          <p className="w-full text-[11px] sm:text-xs text-slate-400 mt-0.5 break-words">{card.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
