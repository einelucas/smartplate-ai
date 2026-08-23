// components/social/CommunityHeader.tsx
"use client";

import { motion } from "framer-motion";
import { Flame, Star, Trophy } from "lucide-react";
import { useCommunityMe } from "@/hooks/useCommunity";

export default function CommunityHeader() {
  const { data, isLoading } = useCommunityMe();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[68px] bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  const gamification = data?.gamification;

  const cards = [
    {
      icon: Flame,
      color: "text-orange-500",
      bg: "bg-orange-50",
      value: gamification?.currentStreak ?? 0,
      label: "dias seguidos",
    },
    {
      icon: Star,
      color: "text-[#007BFF]",
      bg: "bg-[#007BFF]/10",
      value: gamification?.totalXp ?? 0,
      label: "XP total",
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
    <div className="grid grid-cols-3 gap-3 mb-6">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3"
        >
          <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <card.icon size={20} className={card.color} />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-slate-800 leading-none truncate">{card.value}</p>
            <p className="text-xs text-slate-400 mt-1 truncate">{card.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
