// components/XpTodayCard.tsx
// Card "XP de hoje" da Início — breakdown por ação (não é o XP vitalício já
// mostrado no cabeçalho da Comunidade). Reaproveita useGamificationDetail
// (mesma chamada já usada em app/profile via hooks/useProfile.ts).
"use client";

import { Star } from "lucide-react";
import styles from "./HomeDashboard.module.css";
import { useGamificationDetail } from "@/hooks/useCommunity";

interface XpTodayEntry {
  eventType: string;
  label: string;
  points: number;
  count: number;
}

export default function XpTodayCard() {
  const { data, isLoading } = useGamificationDetail();
  const xpToday: XpTodayEntry[] = data?.xpToday ?? [];
  const totalToday = xpToday.reduce((sum, entry) => sum + entry.points, 0);

  return (
    <div className={styles.card}>
      <div className={styles.sectionHead}>
        <h3 className="flex items-center gap-2 font-normal">
          <Star size={18} className="text-[#747b7c]" />
          XP de hoje
        </h3>
        <span className="text-lg font-normal text-[#191a18]">+{totalToday}</span>
      </div>

      {isLoading && <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />}

      {!isLoading && xpToday.length === 0 && (
        <p className="text-sm text-slate-400">Nenhum XP ganho ainda hoje. Complete uma refeição ou atividade para começar.</p>
      )}

      {!isLoading && xpToday.length > 0 && (
        <ul className="space-y-2">
          {xpToday.map((entry) => (
            <li key={entry.eventType} className="flex items-center justify-between text-sm">
              <span className="text-slate-600">
                {entry.label}
                {entry.count > 1 ? ` (${entry.count}x)` : ""}
              </span>
              <span className="font-semibold text-slate-800">+{entry.points}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
