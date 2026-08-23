// app/community/invite/[code]/page.tsx
// PÚBLICA (ver middleware.ts) — acessível por usuários deslogados. Apenas
// mostra o preview e oferece login/cadastro; a entrada real no grupo exige
// autenticação (POST /api/community/groups/join).
"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Users2, Leaf, ArrowRight } from "lucide-react";
import { useGroupInvitePreview, useJoinGroupByCode } from "@/hooks/useCommunity";
import { PENDING_INVITE_STORAGE_KEY } from "@/lib/community/constants";

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const { data, isLoading, isError } = useGroupInvitePreview(code);
  const joinGroup = useJoinGroupByCode();
  const [joined, setJoined] = useState(false);

  const handleAuthRedirect = (path: "/sign-in" | "/sign-up") => {
    try {
      localStorage.setItem(PENDING_INVITE_STORAGE_KEY, code);
    } catch {
      // Sem localStorage disponível — segue para o auth mesmo assim.
    }
    router.push(path);
  };

  const handleJoin = () => {
    joinGroup.mutate(code, {
      onSuccess: (result) => {
        setJoined(true);
        try {
          localStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
        } catch {
          // ignora
        }
        setTimeout(() => router.push(`/community/groups/${result.group.id}`), 800);
      },
    });
  };

  if (!isLoaded || isLoading) {
    return (
      <div className="max-w-md mx-auto mt-16 p-4">
        <div className="h-56 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-md mx-auto mt-16 p-4 text-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
          <p className="font-semibold text-slate-700">Convite não encontrado</p>
          <p className="text-sm text-slate-500 mt-1">Esse código pode ter expirado ou sido regenerado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center"
      >
        <div className="w-14 h-14 mx-auto bg-gradient-to-br from-[#007BFF] to-[#28A745] rounded-2xl flex items-center justify-center mb-4">
          <Leaf className="text-white" size={26} />
        </div>
        <p className="text-sm text-slate-400 mb-1">Você foi convidado para o grupo</p>
        <h1 className="text-xl font-bold text-slate-800">{data.name}</h1>
        {data.description && <p className="text-sm text-slate-500 mt-2">{data.description}</p>}
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-3 mb-6">
          <Users2 size={12} /> {data.memberCount} {data.memberCount === 1 ? "membro" : "membros"}
        </div>

        {joined ? (
          <p className="text-sm font-medium text-[#28A745]">Você entrou no grupo! Redirecionando...</p>
        ) : isSignedIn ? (
          <button
            onClick={handleJoin}
            disabled={joinGroup.isPending}
            className="w-full bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {joinGroup.isPending ? "Entrando..." : "Entrar no grupo"} <ArrowRight size={16} />
          </button>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => handleAuthRedirect("/sign-up")}
              className="w-full bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl py-3 text-sm font-semibold"
            >
              Criar conta e entrar
            </button>
            <button
              onClick={() => handleAuthRedirect("/sign-in")}
              className="w-full border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl py-3 text-sm font-semibold"
            >
              Já tenho conta
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
