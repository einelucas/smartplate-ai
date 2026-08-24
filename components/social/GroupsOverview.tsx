// components/social/GroupsOverview.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Plus, KeyRound, Users2 } from "lucide-react";
import { useMyGroups } from "@/hooks/useCommunity";
import type { GroupSummary } from "@/types/community";

const CreateGroupModal = dynamic(() => import("./CreateGroupModal"), { ssr: false });
const JoinWithCodeModal = dynamic(() => import("./JoinWithCodeModal"), { ssr: false });

const ROLE_LABELS: Record<string, string> = { OWNER: "Dono", ADMIN: "Admin", MEMBER: "Membro" };

export default function GroupsOverview() {
  const { data, isLoading, isError } = useMyGroups();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const groups = data?.groups ?? [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
        <h2 className="font-bold text-slate-800 text-lg">Meus grupos</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJoin(true)}
            className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl px-4 py-2 text-sm font-medium"
          >
            <KeyRound size={16} /> Entrar com código
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl px-4 py-2 text-sm font-medium"
          >
            <Plus size={16} /> Criar grupo
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {isError && <p className="text-sm text-slate-500">Não foi possível carregar seus grupos agora.</p>}

      {!isLoading && !isError && groups.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
          <div className="w-14 h-14 mx-auto bg-[#007BFF]/10 rounded-2xl flex items-center justify-center mb-4">
            <Users2 className="text-[#007BFF]" size={24} />
          </div>
          <p className="font-semibold text-slate-700">Você ainda não participa de nenhum grupo.</p>
          <p className="text-sm text-slate-500 mt-1 mb-5">
            Crie um grupo com amigos ou entre usando um código de convite.
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => setShowCreate(true)} className="bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl px-4 py-2 text-sm font-medium">
              Criar grupo
            </button>
            <button onClick={() => setShowJoin(true)} className="border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl px-4 py-2 text-sm font-medium">
              Entrar com código
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group: GroupSummary, i: number) => (
          <motion.div key={group.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link
              href={`/community/groups/${group.id}`}
              className="block bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-[#007BFF]/30 transition-colors h-full"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-slate-800 truncate">{group.name}</h3>
                <span className="text-[10px] font-semibold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full flex-shrink-0">
                  {ROLE_LABELS[group.role] ?? group.role}
                </span>
              </div>
              {group.description && <p className="text-sm text-slate-500 line-clamp-2 mb-3">{group.description}</p>}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Users2 size={14} /> {group.memberCount} {group.memberCount === 1 ? "membro" : "membros"}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinWithCodeModal onClose={() => setShowJoin(false)} />}
    </div>
  );
}
