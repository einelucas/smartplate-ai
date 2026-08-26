// components/social/SocialFeed.tsx
// Comunidade Geral: Feed | Ranking | Desafios. Dados 100% reais via
// hooks/useCommunity.ts — nenhum usuário/post fake.
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useFriends } from "@/hooks/useCommunity";
import type { FriendEntry } from "@/types/community";
import FriendsPanel from "./FriendsPanel";
import PostFeedList from "./PostFeedList";
import LeaderboardCard from "./LeaderboardCard";
import ChallengesList from "./ChallengesList";
import Avatar from "./Avatar";

const tabs = [
  { id: "feed", label: "Feed" },
  { id: "ranking", label: "Ranking" },
  { id: "desafios", label: "Desafios" },
];

export default function SocialFeed() {
  const [activeTab, setActiveTab] = useState("feed");
  const [showFriends, setShowFriends] = useState(false);
  const { data: friendsData } = useFriends();

  const friends = friendsData?.accepted ?? [];
  const pendingCount = friendsData?.incomingPending.length ?? 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div className="flex bg-white border border-slate-200 p-1 rounded-xl w-full sm:w-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? "bg-[#007BFF] text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowFriends(true)}
          className="relative bg-[#007BFF] hover:bg-[#0056b3] text-white rounded-xl px-4 py-2 text-sm font-medium flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Amigos
          {pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
              <span className="text-[10px] font-bold text-white leading-none">{pendingCount > 9 ? "9+" : pendingCount}</span>
            </span>
          )}
        </button>
      </div>

      {activeTab === "feed" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <PostFeedList />
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4">Amigos</h3>
              {friends.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Adicione amigos para comparar sua consistência e participar de desafios juntos.
                </p>
              ) : (
                <div className="space-y-3">
                  {friends.slice(0, 5).map((f: FriendEntry) => (
                    <div key={f.friendshipId} className="flex items-center gap-3">
                      <Avatar avatarUrl={f.avatarUrl} name={f.displayName || "U"} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-700 text-sm truncate">{f.displayName}</p>
                        <p className="text-xs text-slate-400 truncate">@{f.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowFriends(true)}
                className="w-full mt-4 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Ver todos os amigos
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "ranking" && (
        <div className="max-w-2xl">
          <LeaderboardCard scope="global" />
        </div>
      )}

      {activeTab === "desafios" && <ChallengesList scope="global" />}

      {showFriends && (
        <FriendsPanel onClose={() => setShowFriends(false)} initialTab={pendingCount > 0 ? "requests" : "friends"} />
      )}
    </div>
  );
}
