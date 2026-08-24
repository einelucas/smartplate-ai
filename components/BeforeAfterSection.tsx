// components/BeforeAfterSection.tsx
// Seção "Antes & Depois" real, baseada em ProgressPhoto (privado — nunca
// exposto pela Comunidade). Usa <img> para os uploads locais/remotos
// conscientemente, sem exigir configuração global de next/image.
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Camera, ImageIcon, Sparkles, History } from "lucide-react";
import { useProgressPhotos, type ProgressPhoto } from "@/hooks/useProgressPhotos";

const AddProgressPhotoModal = dynamic(() => import("./AddProgressPhotoModal"), { ssr: false });
const ProgressPhotoHistoryModal = dynamic(() => import("./ProgressPhotoHistoryModal"), { ssr: false });

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function FilledCard({ label, photo }: { label: string; photo: ProgressPhoto }) {
  return (
    <div className="relative h-36 sm:h-40 rounded-xl overflow-hidden bg-slate-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.imageUrl} alt={`Foto de progresso — ${label}, ${formatDate(photo.takenAt)}`} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute bottom-2 left-2.5 text-white">
        <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
        <p className="text-xs opacity-90">{formatDate(photo.takenAt)}</p>
        <p className="text-xs opacity-90">{photo.weight != null ? `${photo.weight} kg` : "Peso não informado"}</p>
      </div>
    </div>
  );
}

function EmptyCard({ title, subtitle, onClick, accent }: { title: string; subtitle: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Adicionar foto"
      className={`h-36 sm:h-40 rounded-xl flex flex-col items-center justify-center gap-1.5 p-3 text-center transition-colors border-2 border-dashed ${
        accent ? "bg-gradient-to-br from-[#28A745]/10 to-[#007BFF]/10 border-[#28A745]/40 hover:border-[#28A745]/60" : "bg-slate-50 border-slate-200 hover:border-[#007BFF]/30"
      }`}
    >
      {accent ? <Sparkles size={24} className="text-[#28A745]" /> : <ImageIcon size={24} className="text-slate-300" />}
      <span className={`text-xs font-medium ${accent ? "text-[#28A745]" : "text-slate-400"}`}>{title}</span>
      <span className="text-[11px] text-slate-400 leading-tight">{subtitle}</span>
    </button>
  );
}

export default function BeforeAfterSection({ currentWeight }: { currentWeight?: number }) {
  const { photos, oldest, newest, isLoading, isError } = useProgressPhotos();
  const [showAdd, setShowAdd] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const hasOnlyOne = photos.length === 1;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-4 gap-2">
        <h3 className="font-bold text-slate-800">Antes &amp; Depois</h3>
        <div className="flex items-center gap-3 flex-shrink-0">
          {photos.length > 0 && (
            <button onClick={() => setShowHistory(true)} className="text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1">
              <History size={12} /> Ver histórico
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="text-xs text-[#007BFF] hover:text-[#0056b3] flex items-center gap-1 font-medium">
            <Camera size={12} /> Adicionar foto
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3">
          <div className="h-36 sm:h-40 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-36 sm:h-40 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      )}

      {isError && !isLoading && <p className="text-sm text-slate-400 text-center py-8">Não foi possível carregar suas fotos.</p>}

      {!isLoading && !isError && (
        <div className="grid grid-cols-2 gap-3">
          {oldest ? (
            <FilledCard label="Antes" photo={oldest} />
          ) : (
            <EmptyCard title="Nenhuma foto" subtitle="Registre o início da sua jornada" onClick={() => setShowAdd(true)} />
          )}

          {newest ? (
            <FilledCard label="Agora" photo={newest} />
          ) : hasOnlyOne ? (
            <EmptyCard title="Adicionar nova foto" subtitle="Compare com o início" onClick={() => setShowAdd(true)} accent />
          ) : (
            <EmptyCard title="Nenhuma foto" subtitle="Acompanhe sua evolução" onClick={() => setShowAdd(true)} />
          )}
        </div>
      )}

      <AddProgressPhotoModal isOpen={showAdd} onClose={() => setShowAdd(false)} currentWeight={currentWeight} />
      {showHistory && <ProgressPhotoHistoryModal onClose={() => setShowHistory(false)} />}
    </div>
  );
}
