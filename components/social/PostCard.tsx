// components/social/PostCard.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  MessageCircle,
  MoreHorizontal,
  Flag,
  UserX,
  Pencil,
  Trash2,
  Flame,
  Target,
  UtensilsCrossed,
} from "lucide-react";
import { useBlockUser, useDeletePost, useToggleReaction, useUpdatePost } from "@/hooks/useCommunity";
import { formatRelativeTime } from "@/lib/community/dates";
import type { CommunityPostSummary } from "@/types/community";
import CommentSection from "./CommentSection";
import ReportModal from "./ReportModal";

const REACTIONS: { type: "LIKE" | "FIRE" | "CLAP" | "STRONG"; emoji: string }[] = [
  { type: "LIKE", emoji: "👍" },
  { type: "FIRE", emoji: "🔥" },
  { type: "CLAP", emoji: "👏" },
  { type: "STRONG", emoji: "💪" },
];

type Post = CommunityPostSummary;

type AchievementMetadata = { title?: string; description?: string; emoji?: string };
type StreakMetadata = { milestone?: number };
type PlanShareMetadata = { shareToken?: string; planName?: string; dietType?: string };

export default function PostCard({
  post,
  groupId,
  onRequireTerms,
}: {
  post: Post;
  groupId?: string;
  onRequireTerms: (action: () => void) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.text ?? "");

  const toggleReaction = useToggleReaction(groupId);
  const deletePost = useDeletePost(groupId);
  const updatePost = useUpdatePost(groupId);
  const blockUser = useBlockUser();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-500 flex-shrink-0 overflow-hidden">
          {post.author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.author.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            post.author.displayName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm truncate">{post.author.displayName}</p>
          <p className="text-xs text-slate-400">{formatRelativeTime(post.createdAt)}</p>
        </div>

        <div className="relative">
          <button onClick={() => setShowMenu((v) => !v)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
            <MoreHorizontal size={18} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-9 bg-white border border-slate-100 shadow-lg rounded-xl py-1.5 w-44 z-10">
              {post.isMine ? (
                <>
                  {post.type === "TEXT" && (
                    <button
                      onClick={() => {
                        setEditing(true);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      <Pencil size={14} /> Editar
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      if (confirm("Excluir esta publicação?")) deletePost.mutate(post.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={14} /> Excluir
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowReport(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <Flag size={14} /> Denunciar
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      if (post.author.userId && confirm(`Bloquear ${post.author.displayName}?`)) {
                        blockUser.mutate(post.author.userId);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                  >
                    <UserX size={14} /> Bloquear usuário
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <PostBody post={post} editing={editing} editText={editText} setEditText={setEditText} />

      {editing && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => {
              updatePost.mutate({ postId: post.id, text: editText.trim() }, { onSuccess: () => setEditing(false) });
            }}
            className="text-xs bg-[#007BFF] text-white rounded-lg px-3 py-1.5 font-medium"
          >
            Salvar
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-slate-500">
            Cancelar
          </button>
        </div>
      )}

      <div className="flex items-center gap-1 pt-3 mt-2 border-t border-slate-100">
        {REACTIONS.map((r) => {
          const active = post.myReactions.includes(r.type);
          const count = post.reactionCounts[r.type] ?? 0;
          return (
            <button
              key={r.type}
              onClick={() => toggleReaction.mutate({ postId: post.id, type: r.type })}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm transition-colors ${
                active ? "bg-[#007BFF]/10 text-[#007BFF]" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <span>{r.emoji}</span>
              {count > 0 && <span className="text-xs font-medium">{count}</span>}
            </button>
          );
        })}

        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 text-slate-500 hover:text-[#007BFF] ml-auto text-sm px-2"
        >
          <MessageCircle size={16} /> {post.commentCount > 0 ? post.commentCount : ""}
        </button>
      </div>

      {showComments && <CommentSection postId={post.id} groupId={groupId} onRequireTerms={onRequireTerms} />}

      {showReport && (
        <ReportModal targetType="POST" targetId={post.id} onClose={() => setShowReport(false)} />
      )}
    </motion.div>
  );
}

function PostBody({
  post,
  editing,
  editText,
  setEditText,
}: {
  post: Post;
  editing: boolean;
  editText: string;
  setEditText: (v: string) => void;
}) {
  if (editing) {
    return (
      <textarea
        value={editText}
        onChange={(e) => setEditText(e.target.value.slice(0, 500))}
        className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-700 resize-none"
        rows={3}
      />
    );
  }

  if (post.type === "ACHIEVEMENT") {
    const { title, description, emoji } = (post.metadata ?? {}) as AchievementMetadata;
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-4 flex items-center gap-3">
        <span className="text-3xl">{emoji ?? "🏆"}</span>
        <div>
          <p className="font-bold text-slate-800 text-sm">{title ?? "Nova conquista"}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
    );
  }

  if (post.type === "STREAK") {
    const { milestone } = (post.metadata ?? {}) as StreakMetadata;
    return (
      <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-100 rounded-xl p-4 flex items-center gap-3">
        <Flame className="text-orange-500 flex-shrink-0" size={28} />
        <div>
          <p className="font-bold text-slate-800 text-sm">{milestone} dias de consistência!</p>
          {post.text && <p className="text-xs text-slate-500 mt-0.5">{post.text}</p>}
        </div>
      </div>
    );
  }

  if (post.type === "CHALLENGE") {
    return (
      <div className="bg-[#007BFF]/5 border border-[#007BFF]/20 rounded-xl p-4 flex items-center gap-3">
        <Target className="text-[#007BFF] flex-shrink-0" size={24} />
        <p className="text-sm text-slate-700">{post.text || "Progresso em um desafio"}</p>
      </div>
    );
  }

  if (post.type === "PLAN_SHARE") {
    const { shareToken, planName, dietType } = (post.metadata ?? {}) as PlanShareMetadata;
    return (
      <div>
        {post.text && <p className="text-slate-600 text-sm mb-3">{post.text}</p>}
        <Link
          href={shareToken ? `/shared/${shareToken}` : "#"}
          target="_blank"
          className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-4 hover:bg-slate-100 transition-colors"
        >
          <div className="w-10 h-10 bg-[#28A745]/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <UtensilsCrossed size={18} className="text-[#28A745]" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-sm truncate">{planName || "Plano alimentar"}</p>
            <p className="text-xs text-slate-400">{dietType || "Ver plano compartilhado"}</p>
          </div>
        </Link>
      </div>
    );
  }

  return <p className="text-slate-700 text-sm whitespace-pre-wrap break-words">{post.text}</p>;
}
