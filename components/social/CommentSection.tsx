// components/social/CommentSection.tsx
"use client";

import { useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { useComments, useCreateComment, useDeleteComment } from "@/hooks/useCommunity";
import { formatRelativeTime } from "@/lib/community/dates";
import Avatar from "./Avatar";

export default function CommentSection({
  postId,
  groupId,
  onRequireTerms,
}: {
  postId: string;
  groupId?: string;
  onRequireTerms: (action: () => void) => void;
}) {
  const { data, isLoading, fetchNextPage, hasNextPage } = useComments(postId);
  const createComment = useCreateComment(postId, groupId);
  const deleteComment = useDeleteComment(postId, groupId);
  const [text, setText] = useState("");

  const comments = data?.pages.flatMap((page) => page.items) ?? [];

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onRequireTerms(() => {
      createComment.mutate(trimmed, { onSuccess: () => setText("") });
    });
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
      {isLoading && <p className="text-xs text-slate-400">Carregando comentários...</p>}

      {comments.map((comment) => (
        <div key={comment.id} className="flex items-start gap-2 group">
          <Avatar avatarUrl={comment.author?.avatarUrl} name={comment.author?.displayName || "U"} sizeClassName="w-7 h-7" textSizeClassName="text-xs" />
          <div className="flex-1 min-w-0 bg-slate-50 rounded-xl px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700">{comment.author?.displayName || "Usuário"}</p>
              <span className="text-[10px] text-slate-400">{formatRelativeTime(comment.createdAt)}</span>
            </div>
            <p className="text-sm text-slate-600 break-words">{comment.text}</p>
          </div>
          {comment.isMine && (
            <button
              onClick={() => deleteComment.mutate(comment.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity flex-shrink-0 mt-2"
              title="Excluir comentário"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}

      {hasNextPage && (
        <button onClick={() => fetchNextPage()} className="text-xs text-[#007BFF] font-medium">
          Ver mais comentários
        </button>
      )}

      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 300))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Escreva um comentário..."
          className="flex-1 bg-slate-100 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none"
        />
        <button
          onClick={submit}
          disabled={createComment.isPending || !text.trim()}
          className="w-8 h-8 bg-[#007BFF] hover:bg-[#0056b3] rounded-lg flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
