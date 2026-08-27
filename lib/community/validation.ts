// lib/community/validation.ts
// Schemas centralizados de validação de entrada da Comunidade. Nunca confiar
// apenas em validação de frontend (maxLength, etc.) — tudo aqui é reforçado
// no backend.
import { z } from "zod";
import { isTrustedClerkImageUrl } from "./avatar";

// ─── Perfil social ──────────────────────────────────────────────────────────

const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

export function sanitizeUsername(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "") // remove acentos
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 24);
}

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Nome de usuário muito curto")
  .max(24, "Nome de usuário muito longo")
  .regex(/^[a-z0-9_.]+$/, "Use apenas letras minúsculas, números, ponto e underline");

export const updateSocialProfileSchema = z.object({
  username: usernameSchema.optional(),
  displayName: z.string().trim().min(1).max(40).optional(),
  bio: z.string().trim().max(280).optional().nullable(),
  timezone: z.string().trim().min(1).max(64).optional(),
  isDiscoverable: z.boolean().optional(),
  showStreak: z.boolean().optional(),
  showXp: z.boolean().optional(),
  showAchievements: z.boolean().optional(),
  notifySocial: z.boolean().optional(),
  notifyMeals: z.boolean().optional(),
  notifyActivities: z.boolean().optional(),
  notifyChallenges: z.boolean().optional(),
  notifyStreak: z.boolean().optional(),
  notifyProgress: z.boolean().optional(),
  notifyReminders: z.boolean().optional(),
  acceptTerms: z.literal(true).optional(),
  // Aponta sempre pro storage do Clerk (onde user.setProfileImage grava o
  // upload) — nunca uma URL arbitrária enviada pelo cliente. `null` remove a
  // foto personalizada (volta pro fallback do provedor). Campo ausente =
  // não mexe no valor atual. Esta era a causa raiz do bug de sincronização:
  // este schema não tinha nenhum campo de avatar, então o PATCH descartava
  // silenciosamente a foto enviada (Zod remove chaves desconhecidas por
  // padrão) — o upload "funcionava" no Clerk, mas nunca chegava no banco.
  customAvatarUrl: z
    .string()
    .trim()
    .refine((url) => isTrustedClerkImageUrl(url), "URL de imagem inválida")
    .nullable()
    .optional(),
});

// ─── Posts / reações / comentários ─────────────────────────────────────────

export const postTypeSchema = z.enum(["TEXT", "ACHIEVEMENT", "STREAK", "CHALLENGE", "PLAN_SHARE", "ACTIVITY", "EXTERNAL_SHARE", "PROGRESS_SHARE"]);
export const postTextSchema = z.string().trim().min(1, "Texto vazio").max(500, "Texto muito longo");

// ─── Compartilhamento externo genérico (conteúdo fornecido pelo usuário —
// nunca dado obtido via API de integração; ver seção 12 do checklist) ──────

export const externalShareProviderSchema = z.enum([
  "STRAVA",
  "GARMIN",
  "APPLE_FITNESS",
  "SAMSUNG_HEALTH",
  "NIKE_RUN_CLUB",
  "ADIDAS_RUNNING",
  "OTHER",
]);

/** Só https — bloqueia javascript:/data:/file: e qualquer outro esquema perigoso. */
export function isSafeExternalShareUrl(raw: string): boolean {
  try {
    return new URL(raw).protocol === "https:";
  } catch {
    return false;
  }
}

export const externalShareUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(isSafeExternalShareUrl, { message: "Informe um link https válido" });

// Limites de imagem reutilizados por qualquer upload de mídia da Comunidade
// (post de texto, atividade, external share) — todos passam pelo mesmo
// crop/preview no client antes do upload, então o mesmo conjunto de tipos
// aceitos vale para todos (sem GIF: o crop já achata pra um frame único).
export const EXTERNAL_SHARE_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const EXTERNAL_SHARE_ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const createPostSchema = z
  .object({
    type: postTypeSchema,
    groupId: z.string().trim().min(1).max(64).optional(),
    text: z.string().trim().max(500).optional(),
    // Foto genérica (pathname do Blob) — TEXT, ACTIVITY e ACHIEVEMENT.
    // EXTERNAL_SHARE continua com seu próprio campo abaixo (fluxo/validação
    // já estabelecidos). width/height são as dimensões reais do arquivo já
    // cortado (calculadas no client, nunca confiadas cegamente — validadas
    // contra o limite de saída do editor de imagem) — usadas só pra reservar
    // o espaço da imagem no feed antes dela carregar, nunca pra lógica de
    // negócio. Opcionais: posts antigos (antes desta funcionalidade) e
    // qualquer post sem essas dimensões continuam funcionando sem elas.
    imageUrl: z.string().trim().min(1).max(300).optional(),
    imageWidth: z.number().int().positive().max(4096).optional(),
    imageHeight: z.number().int().positive().max(4096).optional(),
    achievementCode: z.string().trim().max(32).optional(),
    streakMilestone: z.number().int().positive().max(10000).optional(),
    shareToken: z.string().trim().min(1).max(128).optional(),
    // Snapshot de refeição específica (seção 23 do checklist) — nunca uma
    // referência viva, só o que o usuário está escolhendo mostrar agora.
    mealName: z.string().trim().min(1).max(120).optional(),
    mealCalories: z.number().int().min(0).max(20000).optional(),
    mealProtein: z.number().min(0).max(2000).optional(),
    mealCarbs: z.number().min(0).max(2000).optional(),
    mealFat: z.number().min(0).max(2000).optional(),
    showMacros: z.boolean().optional(),
    // Compartilhar Antes & Depois (seção 22) — ProgressPhoto continua
    // sempre privado por padrão; o post é uma CÓPIA explícita e deliberada
    // do blob (ver copyPrivateImage), nunca um link direto ao registro
    // privado. Peso só entra no metadata quando showWeight é true.
    progressPhotoId: z.string().trim().min(1).max(64).optional(),
    showWeight: z.boolean().optional(),
    activityLogId: z.string().trim().min(1).max(64).optional(),
    externalShareProvider: externalShareProviderSchema.optional(),
    externalShareUrl: externalShareUrlSchema.optional(),
    externalShareImageUrl: z.string().trim().min(1).max(300).optional(),
  })
  .refine((data) => data.type !== "TEXT" || !!data.text || !!data.imageUrl, {
    message: "Escreva algo ou adicione uma imagem",
    path: ["text"],
  })
  .refine((data) => data.type !== "ACHIEVEMENT" || !!data.achievementCode, {
    message: "achievementCode é obrigatório para posts do tipo ACHIEVEMENT",
    path: ["achievementCode"],
  })
  .refine((data) => data.type !== "STREAK" || !!data.streakMilestone, {
    message: "streakMilestone é obrigatório para posts do tipo STREAK",
    path: ["streakMilestone"],
  })
  .refine((data) => data.type !== "PLAN_SHARE" || !!data.shareToken || !!data.mealName, {
    message: "shareToken ou mealName é obrigatório para posts do tipo PLAN_SHARE",
    path: ["shareToken"],
  })
  .refine((data) => data.type !== "ACTIVITY" || !!data.activityLogId, {
    message: "activityLogId é obrigatório para posts do tipo ACTIVITY",
    path: ["activityLogId"],
  })
  .refine((data) => data.type !== "PROGRESS_SHARE" || !!data.progressPhotoId, {
    message: "progressPhotoId é obrigatório para posts do tipo PROGRESS_SHARE",
    path: ["progressPhotoId"],
  })
  .refine((data) => data.type !== "EXTERNAL_SHARE" || !!data.externalShareProvider, {
    message: "Selecione o app de origem",
    path: ["externalShareProvider"],
  })
  .refine(
    (data) => data.type !== "EXTERNAL_SHARE" || !!(data.externalShareUrl || data.externalShareImageUrl || data.text),
    {
      message: "Adicione um link, uma imagem ou uma legenda",
      path: ["externalShareUrl"],
    }
  );

export const commentTextSchema = z.object({
  text: z.string().trim().min(1, "Comentário vazio").max(300, "Comentário muito longo"),
});

export const reactionTypeSchema = z.object({
  type: z.enum(["LIKE", "FIRE", "CLAP", "STRONG"]),
});

// ─── Grupos ─────────────────────────────────────────────────────────────────

export const createGroupSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(60, "Nome muito longo"),
  description: z.string().trim().max(300).optional().nullable(),
});

export const updateGroupSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(300).optional().nullable(),
});

export const inviteCodeSchema = z
  .string()
  .trim()
  .min(4)
  .max(32)
  .regex(/^[a-zA-Z0-9]+$/, "Código de convite inválido");

export const joinGroupSchema = z.object({
  inviteCode: inviteCodeSchema,
});

export const changeMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]), // OWNER só via transferência dedicada
});

export const inviteUserToGroupSchema = z.object({
  targetUserId: z.string().trim().min(1).max(128),
});

export const respondGroupInviteSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

// ─── Busca / amigos ─────────────────────────────────────────────────────────

export const searchQuerySchema = z.string().trim().min(2).max(30);

export const sendFriendRequestSchema = z.object({
  targetUserId: z.string().trim().min(1).max(128),
});

export const friendActionSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export const blockUserSchema = z.object({
  targetUserId: z.string().trim().min(1).max(128),
});

export const muteUserSchema = z.object({
  targetUserId: z.string().trim().min(1).max(128),
});

// Mesmos valores de PostType — validado aqui mesmo a coluna sendo String
// (nunca aceitar um tipo arbitrário só porque o banco não tem enum).
export const mutePostTypeSchema = z.object({
  postType: z.enum(["TEXT", "ACHIEVEMENT", "STREAK", "CHALLENGE", "PLAN_SHARE", "ACTIVITY", "EXTERNAL_SHARE"]),
});

// ─── Desafios ───────────────────────────────────────────────────────────────

export const createChallengeSchema = z
  .object({
    scope: z.enum(["GLOBAL", "GROUP"]),
    groupId: z.string().trim().min(1).max(64).optional(),
    title: z.string().trim().min(2).max(80),
    description: z.string().trim().max(300).optional().nullable(),
    metric: z.enum([
      "ACTIVE_DAYS",
      "MEAL_COMPLETIONS",
      "STREAK_DAYS",
      "ACTIVITY_COUNT",
      "ACTIVITY_MINUTES",
      "WALKING_DAYS",
      "RUNNING_DAYS",
      "CYCLING_DAYS",
      "STRENGTH_DAYS",
      "BALANCED_DAYS",
    ]),
    target: z.number().int().min(1).max(1000),
    // Meta "editorial" opcional do grupo (só GROUP) — quando ausente, o
    // ranking continua derivando o coletivo automaticamente (target * nº de
    // participantes), comportamento inalterado.
    collectiveTarget: z.number().int().min(1).max(100000).optional(),
    rewardXp: z.number().int().min(0).max(5000).default(0),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine((data) => data.endsAt.getTime() > data.startsAt.getTime(), {
    message: "endsAt deve ser depois de startsAt",
    path: ["endsAt"],
  })
  .refine((data) => data.scope !== "GROUP" || !!data.groupId, {
    message: "groupId é obrigatório para desafios de grupo",
    path: ["groupId"],
  })
  .refine((data) => data.scope !== "GLOBAL" || data.collectiveTarget === undefined, {
    message: "collectiveTarget só se aplica a desafios de grupo",
    path: ["collectiveTarget"],
  });

// ─── Denúncias ──────────────────────────────────────────────────────────────

export const createReportSchema = z.object({
  targetType: z.enum(["POST", "COMMENT", "USER"]),
  targetId: z.string().trim().min(1).max(64),
  reason: z.enum([
    "SPAM",
    "HARASSMENT",
    "HATE",
    "SEXUAL",
    "DANGEROUS_HEALTH_ADVICE",
    "MISINFORMATION",
    "OTHER",
  ]),
  details: z.string().trim().max(500).optional().nullable(),
});

export const resolveReportSchema = z.object({
  status: z.enum(["RESOLVED", "DISMISSED"]),
});

// ─── Paginação ──────────────────────────────────────────────────────────────

export const cursorPaginationSchema = z.object({
  cursor: z.string().trim().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
