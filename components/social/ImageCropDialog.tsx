// components/social/ImageCropDialog.tsx
// Editor de imagem (crop/aspect/zoom/rotação) reutilizado por qualquer fluxo
// que aceite imagem — composer de texto, atividade, external share. Nunca
// filtros de cor/stickers/desenho (fora de escopo). Só slide/fade na entrada
// (nunca transform:scale — atrapalha o cálculo de área do react-easy-crop).
"use client";

import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCw, Loader2 } from "lucide-react";
import { computeAspect, getCroppedImageFile, outputMimeType, type AspectKey, type CropArea } from "@/lib/community/image-crop-utils";

const ASPECT_OPTIONS: { key: AspectKey; label: string }[] = [
  { key: "ORIGINAL", label: "Original" },
  { key: "SQUARE", label: "1:1" },
  { key: "PORTRAIT", label: "4:5" },
  { key: "LANDSCAPE", label: "16:9" },
  { key: "FREE", label: "Livre" },
];

export default function ImageCropDialog({
  imageSrc,
  originalFile,
  onCancel,
  onApply,
}: {
  imageSrc: string;
  originalFile: File;
  onCancel: () => void;
  onApply: (file: File) => void;
}) {
  const [aspectKey, setAspectKey] = useState<AspectKey>("ORIGINAL");
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [applying, setApplying] = useState(false);

  const aspect = computeAspect(aspectKey, naturalSize?.width, naturalSize?.height);

  const onCropComplete = useCallback((_area: CropArea, areaPixels: CropArea) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleApply = async () => {
    if (!croppedAreaPixels || applying) return;
    setApplying(true);
    try {
      const file = await getCroppedImageFile({
        imageSrc,
        croppedAreaPixels,
        rotation,
        fileName: originalFile.name.replace(/\.[^.]+$/, "") + (outputMimeType(originalFile.type) === "image/png" ? ".png" : ".webp"),
        mimeType: outputMimeType(originalFile.type),
      });
      onApply(file);
    } catch {
      setApplying(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col max-h-[95vh]"
        >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <h3 className="font-semibold text-slate-800">Editar imagem</h3>
            <button onClick={onCancel} aria-label="Cancelar edição" className="p-2 text-slate-400 hover:text-slate-700 rounded-lg">
              <X size={18} />
            </button>
          </div>

          <div className="relative bg-slate-900 w-full" style={{ height: "min(60vh, 420px)" }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect ?? 1}
              cropShape="rect"
              showGrid
              restrictPosition
              zoomWithScroll
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              onMediaLoaded={(size) => setNaturalSize({ width: size.naturalWidth, height: size.naturalHeight })}
            />
          </div>

          <div className="p-4 space-y-4 flex-shrink-0">
            <div className="flex flex-wrap gap-2">
              {ASPECT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setAspectKey(opt.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 min-h-[36px] ${
                    aspectKey === opt.key ? "border-[#007BFF] bg-[#007BFF]/10 text-[#007BFF]" : "border-slate-200 text-slate-500"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="crop-zoom" className="text-xs font-medium text-slate-500 mb-1.5 block">
                Zoom
              </label>
              <input
                id="crop-zoom"
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-[#007BFF]"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                aria-label="Girar imagem 90 graus"
                className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <RotateCw size={16} /> Girar
              </button>

              <button
                onClick={handleApply}
                disabled={!croppedAreaPixels || applying}
                aria-label="Aplicar corte"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {applying ? <Loader2 size={16} className="animate-spin" /> : null}
                {applying ? "Aplicando..." : "Aplicar"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
