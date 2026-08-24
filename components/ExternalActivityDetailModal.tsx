// components/ExternalActivityDetailModal.tsx
// Detalhe de uma atividade de provider externo (hoje: Strava). Mostra só os
// campos realmente disponíveis (nunca "0 km"/"—"/undefined), deixa claro que
// é privada, e oferece "Compartilhar na Comunidade" — que abre o composer de
// EXTERNAL_SHARE sem nenhum dado pré-preenchido além do provider (nunca copia
// duração/distância/nome para o post).
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, ArrowUpRight, Share2 } from "lucide-react";
import { resolveIcon } from "@/components/icon-registry";
import ProviderIcon from "@/components/ProviderIcon";
import { getProviderDisplay, getShareHeading } from "@/lib/integrations/provider-display";
import { ACTIVITY_TYPE_ICON_KEY } from "@/lib/activity/options";
import type { ActivityHistoryItem } from "@/hooks/useActivityHistory";

const ExternalShareModal = dynamic(() => import("./social/ExternalShareModal"), { ssr: false });

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatDuration(min: number): string {
  const hours = Math.floor(min / 60);
  const minutes = min % 60;
  if (hours === 0) return `${minutes}min`;
  return minutes === 0 ? `${hours}h` : `${hours}h${minutes}min`;
}

export default function ExternalActivityDetailModal({ item, onClose }: { item: ActivityHistoryItem; onClose: () => void }) {
  const [showShare, setShowShare] = useState(false);
  const display = getProviderDisplay(item.source);
  const Icon = resolveIcon(ACTIVITY_TYPE_ICON_KEY[item.activityType] ?? display.icon);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto"
        >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(148,163,184,0.12)" }}>
                <Icon size={20} weight="duotone" className={display.accentClassName} />
              </div>
              <h3 className="font-semibold text-slate-800 truncate">{item.title}</h3>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg flex-shrink-0">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <p className="text-sm text-slate-500">{formatFullDate(item.performedAt)}</p>

            <div className="grid grid-cols-2 gap-3">
              {item.durationMin !== undefined && item.durationMin > 0 && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400">Duração</p>
                  <p className="text-lg font-semibold text-slate-800">{formatDuration(item.durationMin)}</p>
                </div>
              )}
              {item.distanceKm !== undefined && item.distanceKm > 0 && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400">Distância</p>
                  <p className="text-lg font-semibold text-slate-800">{item.distanceKm} km</p>
                </div>
              )}
            </div>

            {item.intensity && (
              <div>
                <p className="text-xs text-slate-400">Intensidade</p>
                <p className="text-sm text-slate-700">{item.intensity}</p>
              </div>
            )}
            {item.notes && (
              <div>
                <p className="text-xs text-slate-400">Observação</p>
                <p className="text-sm text-slate-700">{item.notes}</p>
              </div>
            )}

            <div>
              <p className="text-xs text-slate-400 mb-1">Origem</p>
              <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <ProviderIcon provider={item.source} size={14} className={display.accentClassName} />
                {display.label}
              </p>
            </div>

            {item.isPrivateExternal && (
              <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3">
                <Lock size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500">
                  Esta atividade sincronizada é privada e visível somente para você. Ela não aparece na Comunidade, não gera
                  XP e não conta em ranking, desafios ou sequência.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              {item.providerUrl && (
                <a
                  href={item.providerUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center justify-center gap-1.5 border border-slate-200 text-slate-700 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50"
                >
                  Abrir no {display.label} <ArrowUpRight size={14} />
                </a>
              )}
              {item.isPrivateExternal && (
                <button
                  onClick={() => setShowShare(true)}
                  className="flex items-center justify-center gap-1.5 bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl py-2.5 text-sm font-semibold"
                >
                  <Share2 size={14} /> Compartilhar na Comunidade
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {showShare && (
        <ExternalShareModal
          defaultProvider={item.source}
          heading={getShareHeading(item.source)}
          onClose={() => {
            setShowShare(false);
            onClose();
          }}
        />
      )}
    </AnimatePresence>
  );
}
