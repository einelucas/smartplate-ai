// lib/community/image-crop-utils.ts
// Corte de imagem 100% client-side via Canvas — nunca manda coordenadas de
// crop pro servidor reprocessar (checklist item 21). Puro/sem hooks, só
// funções — só é chamado a partir de componentes client.

export type CropArea = { x: number; y: number; width: number; height: number };
export type AspectKey = "ORIGINAL" | "SQUARE" | "PORTRAIT" | "LANDSCAPE" | "FREE";

const MAX_OUTPUT_DIMENSION = 2048;
const OUTPUT_QUALITY = 0.88;

export function computeAspect(key: AspectKey, naturalWidth?: number, naturalHeight?: number): number | undefined {
  switch (key) {
    case "SQUARE":
      return 1;
    case "PORTRAIT":
      return 4 / 5;
    case "LANDSCAPE":
      return 16 / 9;
    case "FREE":
      return undefined;
    case "ORIGINAL":
    default:
      return naturalWidth && naturalHeight ? naturalWidth / naturalHeight : undefined;
  }
}

/** webp preserva menos peso; PNG só quando a origem já era PNG (preserva transparência). */
export function outputMimeType(originalType: string): "image/webp" | "image/png" {
  return originalType === "image/png" ? "image/png" : "image/webp";
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a imagem"));
    img.src = src;
  });
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Bounding box de width x height depois de rotacionado por `rotation` graus. */
function rotatedBoundingBox(width: number, height: number, rotation: number) {
  const rad = toRadians(rotation);
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

export async function getCroppedImageFile(params: {
  imageSrc: string;
  croppedAreaPixels: CropArea;
  rotation: number;
  fileName: string;
  mimeType: "image/webp" | "image/png";
}): Promise<File> {
  const { imageSrc, croppedAreaPixels, rotation, fileName, mimeType } = params;
  const image = await loadImage(imageSrc);

  // 1) desenha a imagem já rotacionada num canvas grande o bastante pra não
  // cortar cantos (croppedAreaPixels do react-easy-crop já é relativo a esse
  // espaço rotacionado).
  const { width: boxWidth, height: boxHeight } = rotatedBoundingBox(image.width, image.height, rotation);
  const rotateCanvas = document.createElement("canvas");
  rotateCanvas.width = boxWidth;
  rotateCanvas.height = boxHeight;
  const rotateCtx = rotateCanvas.getContext("2d");
  if (!rotateCtx) throw new Error("Canvas não suportado");
  rotateCtx.translate(boxWidth / 2, boxHeight / 2);
  rotateCtx.rotate(toRadians(rotation));
  rotateCtx.translate(-image.width / 2, -image.height / 2);
  rotateCtx.drawImage(image, 0, 0);

  // 2) recorta a área selecionada, já limitando a maior dimensão de saída.
  const scale = Math.min(1, MAX_OUTPUT_DIMENSION / Math.max(croppedAreaPixels.width, croppedAreaPixels.height));
  const outWidth = Math.max(1, Math.round(croppedAreaPixels.width * scale));
  const outHeight = Math.max(1, Math.round(croppedAreaPixels.height * scale));

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = outWidth;
  cropCanvas.height = outHeight;
  const cropCtx = cropCanvas.getContext("2d");
  if (!cropCtx) throw new Error("Canvas não suportado");
  cropCtx.drawImage(
    rotateCanvas,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    outWidth,
    outHeight
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    cropCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))), mimeType, OUTPUT_QUALITY);
  });

  return new File([blob], fileName, { type: mimeType });
}
