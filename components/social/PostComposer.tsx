// components/social/PostComposer.tsx
// Card compacto do feed — só abre o PostComposerModal global (via
// useOpenPostComposer), nunca mantém seu próprio modal/estado. Isso garante
// que é sempre a mesma instância do Composer, esteja o usuário no feed geral
// ou dentro de um grupo.
"use client";

import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";
import { useOpenPostComposer } from "./PostComposerProvider";

export default function PostComposer({ groupId }: { groupId?: string }) {
  const { user } = useUser();
  const openComposer = useOpenPostComposer();

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <button
        type="button"
        onClick={() => openComposer({ groupId })}
        className="w-full flex items-center gap-3 text-left"
      >
        {user?.imageUrl ? (
          <Image src={user.imageUrl} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-[#007BFF] to-[#28A745] rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.firstName?.charAt(0) || "U"}
          </div>
        )}
        <span className="flex-1 min-w-0 bg-slate-100 rounded-xl px-4 py-2.5 text-sm text-slate-400 truncate">Compartilhe algo...</span>
        <span className="w-10 h-10 min-w-[40px] flex items-center justify-center text-slate-500 flex-shrink-0">
          <ImageIcon size={20} />
        </span>
      </button>
    </div>
  );
}
