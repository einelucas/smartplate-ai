// components/social/ChallengesList.tsx
"use client";

import { useState } from "react";
import { Plus, Target } from "lucide-react";
import { useChallenges, useCommunityMe, useGroup } from "@/hooks/useCommunity";
import ChallengeCard from "./ChallengeCard";
import CreateChallengeModal from "./CreateChallengeModal";

export default function ChallengesList({ scope, groupId }: { scope: "global" | "group"; groupId?: string }) {
  const { data, isLoading, isError } = useChallenges(scope, groupId);
  const { data: me } = useCommunityMe();
  const { data: groupData } = useGroup(scope === "group" ? groupId ?? null : null);
  const [showCreate, setShowCreate] = useState(false);

  const isModerator = me?.profile?.role === "MODERATOR" || me?.profile?.role === "ADMIN";
  const isGroupAdmin = groupData?.group?.myRole === "OWNER" || groupData?.group?.myRole === "ADMIN";
  const canCreate = scope === "global" ? isModerator : true;
  const canDelete = scope === "global" ? isModerator : isGroupAdmin;

  const challenges = data?.challenges ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800">Desafios {scope === "global" ? "globais" : "do grupo"}</h3>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-[#007BFF] hover:text-[#0056b3]"
          >
            <Plus size={16} /> Criar desafio
          </button>
        )}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {isError && <p className="text-sm text-slate-500">Não foi possível carregar os desafios agora.</p>}

      {!isLoading && !isError && challenges.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
          <div className="w-14 h-14 mx-auto bg-[#007BFF]/10 rounded-2xl flex items-center justify-center mb-4">
            <Target className="text-[#007BFF]" size={24} />
          </div>
          <p className="font-semibold text-slate-700">Nenhum desafio ativo por aqui.</p>
          <p className="text-sm text-slate-500 mt-1">
            {canCreate ? "Que tal criar o primeiro?" : "Volte em breve para novos desafios."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {challenges.map((challenge) => (
          <ChallengeCard
            key={challenge.id}
            challenge={{ ...challenge, canDelete }}
            scope={scope}
            groupId={groupId}
          />
        ))}
      </div>

      {showCreate && (
        <CreateChallengeModal scope={scope === "global" ? "GLOBAL" : "GROUP"} groupId={groupId} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
