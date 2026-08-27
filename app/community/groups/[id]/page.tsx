// app/community/groups/[id]/page.tsx
"use client";

import { use, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Users2, UserPlus, AlertTriangle } from "lucide-react";
import { useGroup } from "@/hooks/useCommunity";
import PostFeedList from "@/components/social/PostFeedList";
import LeaderboardCard from "@/components/social/LeaderboardCard";
import ChallengesList from "@/components/social/ChallengesList";
import GroupMembersPanel from "@/components/social/GroupMembersPanel";
import GroupStatsPanel from "@/components/social/GroupStatsPanel";

const GroupInviteModal = dynamic(() => import("@/components/social/GroupInviteModal"), { ssr: false });
const GroupSettingsMenu = dynamic(() => import("@/components/social/GroupSettingsMenu"), { ssr: false });

const tabs = [
  { id: "feed", label: "Feed" },
  { id: "ranking", label: "Ranking" },
  { id: "desafios", label: "Desafios" },
  { id: "membros", label: "Membros" },
  { id: "estatisticas", label: "Estatísticas" },
];

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = use(params);
  const { data, isLoading, isError } = useGroup(groupId);
  const [activeTab, setActiveTab] = useState("feed");
  const [showInvite, setShowInvite] = useState(false);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-8">
        <div className="h-24 bg-slate-100 rounded-2xl animate-pulse mb-6" />
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (isError || !data?.group) {
    return (
      <div className="p-4 sm:p-8">
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 max-w-lg mx-auto">
          <div className="w-14 h-14 mx-auto bg-red-50 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle className="text-red-500" size={24} />
          </div>
          <p className="font-semibold text-slate-700">Você não tem acesso a este grupo.</p>
          <p className="text-sm text-slate-500 mt-1 mb-4">Ele pode não existir ou você não é mais membro.</p>
          <Link href="/community" className="text-sm text-[#007BFF] font-medium">
            Voltar para a Comunidade
          </Link>
        </div>
      </div>
    );
  }

  const group = data.group;

  return (
    <div className="p-4 sm:p-8">
      <Link href="/community" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={14} /> Comunidade
      </Link>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-800 truncate">{group.name}</h1>
            {group.description && <p className="text-sm text-slate-500 mt-1">{group.description}</p>}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
              <Users2 size={12} /> {group.memberCount} {group.memberCount === 1 ? "membro" : "membros"}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl px-3 py-2 text-sm font-medium"
            >
              <UserPlus size={14} /> Convidar
            </button>
            <GroupSettingsMenu groupId={groupId} myRole={group.myRole} name={group.name} description={group.description} />
          </div>
        </div>
      </div>

      <div className="flex bg-white border border-slate-200 p-1 rounded-xl w-full sm:w-fit mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id ? "bg-[#007BFF] text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "feed" && (
        <div className="max-w-3xl">
          <PostFeedList groupId={groupId} />
        </div>
      )}
      {activeTab === "ranking" && (
        <div className="max-w-2xl">
          <LeaderboardCard scope="group" groupId={groupId} />
        </div>
      )}
      {activeTab === "desafios" && <ChallengesList scope="group" groupId={groupId} />}
      {activeTab === "membros" && (
        <div className="max-w-2xl">
          <GroupMembersPanel groupId={groupId} myRole={group.myRole} />
        </div>
      )}
      {activeTab === "estatisticas" && <GroupStatsPanel groupId={groupId} />}

      {showInvite && (
        <GroupInviteModal
          groupId={groupId}
          inviteCode={group.inviteCode}
          canRegenerate={group.myRole === "OWNER" || group.myRole === "ADMIN"}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}
