// lib/community/post-draft.ts
// Estado central de rascunho do PostComposer — único dono de texto/mídia/
// attachment/destino. Nenhum subfluxo (refeição/atividade/conquista/outro
// app) publica sozinho: cada um só resolve um PostAttachment e devolve pro
// Composer. Tipos client-safe (sem import de servidor).

export type PostAttachment =
  | { type: "MEAL"; shareToken: string; planName?: string | null; dietType?: string | null }
  // Snapshot de uma refeição específica no momento do compartilhamento —
  // nunca uma referência viva a um Meal/DayPlan (o dashboard de plano
  // alimentar hoje identifica refeições por dia+tipo+índice, não por id
  // estável; um post da Comunidade precisa de conteúdo que não muda depois).
  | { type: "MEAL_ITEM"; mealName: string; calories?: number; protein?: number; carbs?: number; fat?: number; showMacros: boolean }
  | { type: "ACTIVITY"; activityId: string; preview?: { label: string; durationMin: number } }
  | { type: "ACHIEVEMENT"; achievementCode: string; preview?: { title: string; icon: string } }
  | { type: "EXTERNAL_SHARE"; provider: string; url?: string }
  // Antes & Depois (seção 22) — a cópia do blob acontece no servidor a
  // partir de progressPhotoId; nunca envia bytes de imagem pelo cliente aqui.
  | { type: "PROGRESS_SHARE"; progressPhotoId: string; takenAt: string; showWeight: boolean };

export type PostDestination = { type: "GLOBAL" } | { type: "GROUP"; groupId: string; groupName?: string };

export interface PostDraft {
  text: string;
  mediaFile: File | null;
  /** Largura/altura reais de mediaFile (depois do crop) — usadas pro feed reservar o espaço da imagem antes dela carregar. */
  mediaDimensions: { width: number; height: number } | null;
  attachment: PostAttachment | null;
  destination: PostDestination;
}

export function createEmptyDraft(destination: PostDestination = { type: "GLOBAL" }): PostDraft {
  return { text: "", mediaFile: null, mediaDimensions: null, attachment: null, destination };
}

export function isDraftPublishable(draft: PostDraft): boolean {
  return !!(draft.text.trim() || draft.mediaFile || draft.attachment);
}

/**
 * Mapeia o PostDraft (+ pathname de mídia já enviada, se houver) pro payload
 * plano que /api/community/posts já aceita hoje — backend continua
 * discriminando por `type`, sem precisar de endpoint novo nem migration.
 */
export function draftToCreatePostInput(
  draft: PostDraft,
  uploadedImageUrl: string | undefined
): {
  type: "TEXT" | "ACHIEVEMENT" | "PLAN_SHARE" | "ACTIVITY" | "EXTERNAL_SHARE" | "PROGRESS_SHARE";
  text?: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  achievementCode?: string;
  shareToken?: string;
  mealName?: string;
  mealCalories?: number;
  mealProtein?: number;
  mealCarbs?: number;
  mealFat?: number;
  showMacros?: boolean;
  progressPhotoId?: string;
  showWeight?: boolean;
  activityLogId?: string;
  externalShareProvider?: string;
  externalShareUrl?: string;
  externalShareImageUrl?: string;
  groupId?: string;
} {
  const text = draft.text.trim() || undefined;
  const groupId = draft.destination.type === "GROUP" ? draft.destination.groupId : undefined;
  // Só faz sentido anexar dimensões à MESMA imagem que está sendo enviada
  // agora — nunca reaproveitar de um draft anterior.
  const dimensions = uploadedImageUrl && draft.mediaDimensions ? draft.mediaDimensions : undefined;

  if (!draft.attachment) {
    return { type: "TEXT", text, imageUrl: uploadedImageUrl, imageWidth: dimensions?.width, imageHeight: dimensions?.height, groupId };
  }

  switch (draft.attachment.type) {
    case "MEAL":
      return {
        type: "PLAN_SHARE",
        text,
        imageUrl: uploadedImageUrl,
        imageWidth: dimensions?.width,
        imageHeight: dimensions?.height,
        shareToken: draft.attachment.shareToken,
        groupId,
      };
    case "MEAL_ITEM":
      return {
        type: "PLAN_SHARE",
        text,
        imageUrl: uploadedImageUrl,
        imageWidth: dimensions?.width,
        imageHeight: dimensions?.height,
        mealName: draft.attachment.mealName,
        ...(draft.attachment.showMacros
          ? {
              mealCalories: draft.attachment.calories,
              mealProtein: draft.attachment.protein,
              mealCarbs: draft.attachment.carbs,
              mealFat: draft.attachment.fat,
            }
          : {}),
        showMacros: draft.attachment.showMacros,
        groupId,
      };
    case "ACTIVITY":
      return {
        type: "ACTIVITY",
        text,
        imageUrl: uploadedImageUrl,
        imageWidth: dimensions?.width,
        imageHeight: dimensions?.height,
        activityLogId: draft.attachment.activityId,
        groupId,
      };
    case "ACHIEVEMENT":
      return {
        type: "ACHIEVEMENT",
        text,
        imageUrl: uploadedImageUrl,
        imageWidth: dimensions?.width,
        imageHeight: dimensions?.height,
        achievementCode: draft.attachment.achievementCode,
        groupId,
      };
    case "EXTERNAL_SHARE":
      return {
        type: "EXTERNAL_SHARE",
        text,
        externalShareProvider: draft.attachment.provider,
        externalShareUrl: draft.attachment.url,
        externalShareImageUrl: uploadedImageUrl,
        groupId,
      };
    case "PROGRESS_SHARE":
      return {
        type: "PROGRESS_SHARE",
        text,
        progressPhotoId: draft.attachment.progressPhotoId,
        showWeight: draft.attachment.showWeight,
        groupId,
      };
  }
}

/** Pasta de Blob a usar pro upload de mídia deste draft — external-shares fica separado por convenção já estabelecida. */
export function draftMediaFolder(draft: PostDraft): "community" | "external-shares" {
  return draft.attachment?.type === "EXTERNAL_SHARE" ? "external-shares" : "community";
}
