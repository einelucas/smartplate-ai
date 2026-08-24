// components/social/PostComposer.tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { Send, UtensilsCrossed, Link2 } from "lucide-react";
import { PersonSimpleRunIcon } from "@phosphor-icons/react";
import { useCreatePost } from "@/hooks/useCommunity";

const SharePlanModal = dynamic(() => import("./SharePlanModal"), { ssr: false });
const RegisterActivityModal = dynamic(() => import("../RegisterActivityModal"), { ssr: false });
const ExternalShareModal = dynamic(() => import("./ExternalShareModal"), { ssr: false });

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
  const [showActivity, setShowActivity] = useState(false);
  const [showExternalShare, setShowExternalShare] = useState(false);
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
          onClick={() => onRequireTerms(() => setShowActivity(true))}
          className="w-9 h-9 bg-[#007BFF]/10 hover:bg-[#007BFF]/20 rounded-xl flex items-center justify-center text-[#007BFF] flex-shrink-0"
          title="Registrar atividade"
        >
          <PersonSimpleRunIcon size={16} weight="bold" />
        </button>
        <button
          onClick={() => onRequireTerms(() => setShowShare(true))}
          className="w-9 h-9 bg-[#28A745]/10 hover:bg-[#28A745]/20 rounded-xl flex items-center justify-center text-[#28A745] flex-shrink-0"
          title="Compartilhar um plano alimentar"
        >
          <UtensilsCrossed size={16} />
        </button>
        <button
          onClick={() => onRequireTerms(() => setShowExternalShare(true))}
          className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center text-slate-600 flex-shrink-0"
          title="Compartilhar de outro app"
        >
          <Link2 size={16} />
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
      <RegisterActivityModal isOpen={showActivity} onClose={() => setShowActivity(false)} defaultGroupId={groupId} />
      {showExternalShare && <ExternalShareModal groupId={groupId} onClose={() => setShowExternalShare(false)} />}
    </div>
  );
}
