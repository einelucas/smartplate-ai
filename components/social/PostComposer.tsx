// components/social/PostComposer.tsx
"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { Send, UtensilsCrossed } from "lucide-react";
import { useCreatePost } from "@/hooks/useCommunity";
import SharePlanModal from "./SharePlanModal";

export default function PostComposer({
  groupId,
  onRequireTerms,
}: {
  groupId?: string;
  onRequireTerms: (action: () => void) => void;
}) {
  const { user } = useUser();
  const [text, setText] = useState("");
  const [showShare, setShowShare] = useState(false);
  const createPost = useCreatePost(groupId);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onRequireTerms(() => {
      createPost.mutate({ type: "TEXT", text: trimmed }, { onSuccess: () => setText("") });
    });
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-center gap-4">
        {user?.imageUrl ? (
          <Image src={user.imageUrl} alt="Avatar" width={40} height={40} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-[#007BFF] to-[#28A745] rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.firstName?.charAt(0) || "U"}
          </div>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 500))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Compartilhe um hábito, conquista ou mensagem..."
          className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none"
        />
        <button
          onClick={() => onRequireTerms(() => setShowShare(true))}
          className="w-9 h-9 bg-[#28A745]/10 hover:bg-[#28A745]/20 rounded-xl flex items-center justify-center text-[#28A745] flex-shrink-0"
          title="Compartilhar um plano alimentar"
        >
          <UtensilsCrossed size={16} />
        </button>
        <button
          onClick={submit}
          disabled={createPost.isPending || !text.trim()}
          className="w-9 h-9 bg-[#007BFF] hover:bg-[#0056b3] rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>

      {showShare && <SharePlanModal groupId={groupId} onClose={() => setShowShare(false)} />}
    </div>
  );
}
