// components/social/PostComposerModal.tsx
// Dono único do PostDraft e do botão Publicar. Todo subfluxo (refeição,
// atividade, conquista, outro app) só resolve um PostAttachment e devolve
// pra cá — nenhum deles chama a API de criação de post. Mesmo componente em
// mobile (bottom sheet) e desktop (modal central), sem lógica duplicada.
"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ChevronDown, Link2 } from "lucide-react";
import { PersonSimpleRunIcon, TrophyIcon, ForkKnifeIcon } from "@phosphor-icons/react";
import { useCommunityMe, useCreatePost, useHashtagSuggestions, useMyGroups } from "@/hooks/useCommunity";
import { useCommunityMediaUpload } from "@/hooks/useCommunityMediaUpload";
import { useCommunityTermsGate } from "./CommunityTermsGate";
import { resolveIcon } from "@/components/icon-registry";
import ProviderIcon from "@/components/ProviderIcon";
import { getProviderDisplay } from "@/lib/integrations/provider-display";
import PostMediaField from "./PostMediaField";
import Avatar from "./Avatar";
import {
  createEmptyDraft,
  draftMediaFolder,
  draftToCreatePostInput,
  isDraftPublishable,
  type PostAttachment,
  type PostDraft,
} from "@/lib/community/post-draft";

const SharePlanModal = dynamic(() => import("./SharePlanModal"), { ssr: false });
const ActivityPickerModal = dynamic(() => import("./ActivityPickerModal"), { ssr: false });
const AchievementPickerModal = dynamic(() => import("./AchievementPickerModal"), { ssr: false });
const ExternalShareModal = dynamic(() => import("./ExternalShareModal"), { ssr: false });

const MAX_TEXT_LENGTH = 500;
const COUNTER_THRESHOLD = 400;

const ATTACHMENT_LABELS: Record<PostAttachment["type"], string> = {
  MEAL: "Refeição",
  ACTIVITY: "Atividade",
  ACHIEVEMENT: "Conquista",
  EXTERNAL_SHARE: "Compartilhamento externo",
};

function AttachmentCard({ attachment, onRemove }: { attachment: PostAttachment; onRemove: () => void }) {
  let icon = <ForkKnifeIcon size={20} weight="duotone" className="text-[#28A745]" />;
  let title = "";
  let subtitle = "";

  if (attachment.type === "MEAL") {
    title = attachment.planName || "Plano alimentar";
    subtitle = attachment.dietType || "Refeição anexada";
  } else if (attachment.type === "ACTIVITY") {
    icon = <PersonSimpleRunIcon size={20} weight="duotone" className="text-[#007BFF]" />;
    title = attachment.preview?.label ?? "Atividade";
    subtitle = attachment.preview ? `${attachment.preview.durationMin} min · Atividade anexada` : "Atividade anexada";
  } else if (attachment.type === "ACHIEVEMENT") {
    const Icon = attachment.preview ? resolveIcon(attachment.preview.icon) : TrophyIcon;
    icon = <Icon size={20} weight="duotone" className="text-amber-500" />;
    title = attachment.preview?.title ?? "Conquista";
    subtitle = "Conquista anexada";
  } else if (attachment.type === "EXTERNAL_SHARE") {
    const display = getProviderDisplay(attachment.provider);
    icon = <ProviderIcon provider={attachment.provider} size={20} className={display.accentClassName} />;
    title = display.label;
    subtitle = attachment.url || "Compartilhamento anexado";
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 border border-slate-100">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{title}</p>
        <p className="text-xs text-slate-400 truncate">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover ${ATTACHMENT_LABELS[attachment.type].toLowerCase()} anexada`}
        className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-white rounded-lg flex-shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default function PostComposerModal({
  initialAttachment,
  fixedGroupId,
  onClose,
}: {
  initialAttachment: PostAttachment | null;
  fixedGroupId?: string;
  onClose: () => void;
}) {
  const { user } = useUser();
  const { data: meData } = useCommunityMe();
  const { guard, modal: termsModal } = useCommunityTermsGate();
  const { data: myGroups } = useMyGroups();
  const groups = myGroups?.groups ?? [];

  const [draft, setDraft] = useState<PostDraft>(() => ({
    ...createEmptyDraft(fixedGroupId ? { type: "GROUP", groupId: fixedGroupId } : { type: "GLOBAL" }),
    attachment: initialAttachment,
  }));

  const createPost = useCreatePost(fixedGroupId);
  const { uploadMedia, uploading } = useCommunityMediaUpload();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [showDestinationMenu, setShowDestinationMenu] = useState(false);
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const [showAchievementPicker, setShowAchievementPicker] = useState(false);
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [showExternalPicker, setShowExternalPicker] = useState(false);
  // Token de hashtag parcial sendo digitado (ex.: "#cor" antes de completar) —
  // guarda a posição pra poder substituir o trecho certo ao escolher uma
  // sugestão. Detecção aqui é só UX; a extração real acontece no backend.
  const [activeHashtagToken, setActiveHashtagToken] = useState<{ query: string; start: number; end: number } | null>(null);
  const { data: hashtagSuggestions } = useHashtagSuggestions(activeHashtagToken?.query ?? "");

  const isPublishing = createPost.isPending || uploading;
  const canPublish = isDraftPublishable(draft) && !isPublishing;

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.slice(0, MAX_TEXT_LENGTH);
    const cursorPos = e.target.selectionStart;
    setDraft((d) => ({ ...d, text: value }));
    autoGrow(e.target);

    const uptoCursor = value.slice(0, cursorPos);
    const match = uptoCursor.match(/#([\p{L}\p{N}_]{1,30})$/u);
    setActiveHashtagToken(match ? { query: match[1], start: cursorPos - match[0].length, end: cursorPos } : null);
  };

  const applyHashtagSuggestion = (slug: string) => {
    if (!activeHashtagToken) return;
    const { start, end } = activeHashtagToken;
    setDraft((d) => ({ ...d, text: `${d.text.slice(0, start)}#${slug} ${d.text.slice(end)}`.slice(0, MAX_TEXT_LENGTH) }));
    setActiveHashtagToken(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  /** Só 1 attachment estruturado por vez — troca pede confirmação simples se já existir um diferente (item 54). */
  const setAttachment = (next: PostAttachment) => {
    if (draft.attachment && draft.attachment.type !== next.type) {
      const ok = confirm(
        `Substituir ${ATTACHMENT_LABELS[draft.attachment.type].toLowerCase()} anexada pela ${ATTACHMENT_LABELS[next.type].toLowerCase()}?`
      );
      if (!ok) return;
    }
    setDraft((d) => ({ ...d, attachment: next }));
  };

  const openPicker = (open: () => void) => guard(open);

  const handlePublish = () => {
    if (!canPublish) return;
    setError(null);
    guard(async () => {
      try {
        let imageUrl: string | undefined;
        if (draft.mediaFile) imageUrl = await uploadMedia(draft.mediaFile, draftMediaFolder(draft));
        const input = draftToCreatePostInput(draft, imageUrl);
        createPost.mutate(input, { onSuccess: onClose });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível enviar a imagem.");
      }
    });
  };

  const destination = draft.destination;
  const destinationLabel =
    destination.type === "GROUP" ? groups.find((g) => g.id === destination.groupId)?.name ?? "Grupo" : "Comunidade geral";

  return (
    <>
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
            className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-slate-800">Criar publicação</h3>
              <button onClick={onClose} aria-label="Fechar" className="p-2 text-slate-400 hover:text-slate-700 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar avatarUrl={meData?.profile?.avatarUrl} name={user?.firstName || "U"} />
                <p className="font-semibold text-slate-800 text-sm">{user?.firstName || "Você"}</p>
              </div>

              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={draft.text}
                  onChange={handleTextChange}
                  onBlur={() => setTimeout(() => setActiveHashtagToken(null), 150)}
                  placeholder="No que você está pensando?"
                  rows={3}
                  autoFocus
                  className="w-full resize-none outline-none text-slate-800 placeholder:text-slate-400 text-base leading-relaxed max-h-60 overflow-y-auto"
                />
                {draft.text.length >= COUNTER_THRESHOLD && (
                  <p className={`text-xs text-right mt-1 ${draft.text.length >= MAX_TEXT_LENGTH ? "text-red-500" : "text-slate-400"}`}>
                    {draft.text.length}/{MAX_TEXT_LENGTH}
                  </p>
                )}
                {activeHashtagToken && !!hashtagSuggestions?.hashtags.length && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-10">
                    {hashtagSuggestions.hashtags.map((h) => (
                      <button
                        key={h.slug}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyHashtagSuggestion(h.slug)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-slate-50"
                      >
                        <span className="text-[#007BFF] font-medium">#{h.slug}</span>
                        {h.postCount > 0 && <span className="text-xs text-slate-400">{h.postCount} posts</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {draft.attachment && (
                <AttachmentCard attachment={draft.attachment} onRemove={() => setDraft((d) => ({ ...d, attachment: null }))} />
              )}

              <div className="flex items-center gap-2">
                <PostMediaField
                  variant="icon"
                  onChange={(file) => setDraft((d) => ({ ...d, mediaFile: file }))}
                  onError={setError}
                  disabled={isPublishing}
                />
                {!draft.mediaFile && <span className="text-sm text-slate-400">Adicionar foto</span>}
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <div className="border-t border-slate-100 flex-shrink-0">
              <div className="p-3 flex items-center gap-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => openPicker(() => setShowActivityPicker(true))}
                  title="Atividade"
                  aria-label="Anexar atividade"
                  className="flex flex-col items-center gap-0.5 w-14 min-w-[56px] py-1.5 text-slate-500 hover:text-[#007BFF] hover:bg-slate-100 rounded-xl flex-shrink-0"
                >
                  <PersonSimpleRunIcon size={20} />
                  <span className="text-[10px] font-medium">Atividade</span>
                </button>
                <button
                  type="button"
                  onClick={() => openPicker(() => setShowMealPicker(true))}
                  title="Refeição"
                  aria-label="Anexar refeição"
                  className="flex flex-col items-center gap-0.5 w-14 min-w-[56px] py-1.5 text-slate-500 hover:text-[#28A745] hover:bg-slate-100 rounded-xl flex-shrink-0"
                >
                  <ForkKnifeIcon size={20} />
                  <span className="text-[10px] font-medium">Refeição</span>
                </button>
                <button
                  type="button"
                  onClick={() => openPicker(() => setShowAchievementPicker(true))}
                  title="Conquista"
                  aria-label="Anexar conquista"
                  className="flex flex-col items-center gap-0.5 w-14 min-w-[56px] py-1.5 text-slate-500 hover:text-amber-500 hover:bg-slate-100 rounded-xl flex-shrink-0"
                >
                  <TrophyIcon size={20} />
                  <span className="text-[10px] font-medium">Conquista</span>
                </button>
                <button
                  type="button"
                  onClick={() => openPicker(() => setShowExternalPicker(true))}
                  title="Outro app"
                  aria-label="Anexar compartilhamento de outro app"
                  className="flex flex-col items-center gap-0.5 w-14 min-w-[56px] py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl flex-shrink-0"
                >
                  <Link2 size={20} />
                  <span className="text-[10px] font-medium">Outro app</span>
                </button>
              </div>

              <div className="p-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {fixedGroupId ? (
                  <span className="text-xs text-slate-400 truncate min-w-0">{destinationLabel}</span>
                ) : (
                  <div className="relative min-w-0">
                    <button
                      type="button"
                      onClick={() => setShowDestinationMenu((v) => !v)}
                      className="flex items-center gap-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg px-2.5 py-2 min-h-[36px] max-w-[150px]"
                    >
                      <span className="truncate">{destinationLabel}</span> <ChevronDown size={12} className="flex-shrink-0" />
                    </button>
                    {showDestinationMenu && (
                      <div className="absolute bottom-11 left-0 bg-white border border-slate-100 shadow-lg rounded-xl py-1.5 w-48 z-10">
                        <button
                          onClick={() => {
                            setDraft((d) => ({ ...d, destination: { type: "GLOBAL" } }));
                            setShowDestinationMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        >
                          Comunidade geral
                        </button>
                        {groups.map((g) => (
                          <button
                            key={g.id}
                            onClick={() => {
                              setDraft((d) => ({ ...d, destination: { type: "GROUP", groupId: g.id, groupName: g.name } }));
                              setShowDestinationMenu(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 truncate"
                          >
                            {g.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handlePublish}
                  disabled={!canPublish}
                  className="flex items-center gap-2 bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl px-5 py-2.5 min-h-[44px] text-sm font-semibold disabled:opacity-40 flex-shrink-0"
                >
                  {isPublishing && <Loader2 size={16} className="animate-spin" />}
                  {isPublishing ? "Publicando..." : "Publicar"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {showActivityPicker && (
        <ActivityPickerModal
          onClose={() => setShowActivityPicker(false)}
          onSelect={(attachment) => {
            setAttachment(attachment);
            setShowActivityPicker(false);
          }}
        />
      )}
      {showMealPicker && (
        <SharePlanModal
          onClose={() => setShowMealPicker(false)}
          onSelect={(attachment) => {
            setAttachment(attachment);
            setShowMealPicker(false);
          }}
        />
      )}
      {showAchievementPicker && (
        <AchievementPickerModal
          onClose={() => setShowAchievementPicker(false)}
          onSelect={(attachment) => {
            setAttachment(attachment);
            setShowAchievementPicker(false);
          }}
        />
      )}
      {showExternalPicker && (
        <ExternalShareModal
          defaultProvider={draft.attachment?.type === "EXTERNAL_SHARE" ? draft.attachment.provider : undefined}
          onClose={() => setShowExternalPicker(false)}
          onSelect={(attachment) => {
            setAttachment(attachment);
            setShowExternalPicker(false);
          }}
        />
      )}
      {termsModal}
    </>
  );
}
