// components/social/PostFeedList.tsx
// Feed reutilizável (comunidade geral ou grupo). Sempre dados reais — sem
// mocks. "Para você | Amigos" só existe na comunidade geral (sem groupId) —
// grupo continua sempre cronológico, sem personalização (checklist item 24:
// não criar mais um nível confuso de tabs).
"use client";

import { useState } from "react";
import { MessageSquareHeart } from "lucide-react";
import { useCommunityFeed } from "@/hooks/useCommunity";
import { useCommunityTermsGate } from "./CommunityTermsGate";
import PostComposer from "./PostComposer";
import PostCard from "./PostCard";
import type { CommunityPostType, FeedTab } from "@/types/community";

type FeedFilter = "ALL" | "ACTIVITY" | "ACHIEVEMENT" | "EXTERNAL_SHARE";

const FEED_FILTERS: { key: FeedFilter; label: string }[] = [
  { key: "ALL", label: "Tudo" },
  { key: "ACTIVITY", label: "Atividades" },
  { key: "ACHIEVEMENT", label: "Conquistas" },
  { key: "EXTERNAL_SHARE", label: "Compartilhados" },
];

const AUDIENCE_TABS: { key: FeedTab; label: string }[] = [
  { key: "for-you", label: "Para você" },
  { key: "friends", label: "Amigos" },
];

export default function PostFeedList({ groupId }: { groupId?: string }) {
  const [audience, setAudience] = useState<FeedTab>("for-you");
  const effectiveTab: FeedTab = groupId ? "chronological" : audience;

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useCommunityFeed(groupId, effectiveTab);
  const { guard, modal } = useCommunityTermsGate();
  const [filter, setFilter] = useState<FeedFilter>("ALL");

  const allPosts = data?.pages.flatMap((page) => page.items) ?? [];
  const posts = filter === "ALL" ? allPosts : allPosts.filter((post) => post.type === (filter as CommunityPostType));

  return (
    <div className="space-y-4">
      <PostComposer groupId={groupId} />

      {!groupId && (
        <div className="flex bg-white border border-slate-200 p-1 rounded-xl w-full sm:w-fit">
          {AUDIENCE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setAudience(tab.key)}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                audience === tab.key ? "bg-[#007BFF] text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {FEED_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f.key ? "bg-[#007BFF] text-white" : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="h-2 bg-slate-100 rounded w-1/4" />
                </div>
              </div>
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
          <p className="text-sm text-slate-500">Não foi possível carregar o feed agora. Tente novamente em instantes.</p>
        </div>
      )}

      {!isLoading && !isError && posts.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
          <div className="w-14 h-14 mx-auto bg-[#007BFF]/10 rounded-2xl flex items-center justify-center mb-4">
            <MessageSquareHeart className="text-[#007BFF]" size={24} />
          </div>
          {filter !== "ALL" && allPosts.length > 0 ? (
            <p className="font-semibold text-slate-700">Nenhum post desse tipo por aqui ainda.</p>
          ) : effectiveTab === "friends" ? (
            <>
              <p className="font-semibold text-slate-700">Nenhum post de amigos ainda.</p>
              <p className="text-sm text-slate-500 mt-1">Adicione amigos ou publique você mesmo para começar.</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-slate-700">
                {groupId ? "Este grupo ainda não tem publicações." : "A comunidade ainda está começando."}
              </p>
              <p className="text-sm text-slate-500 mt-1">Compartilhe sua primeira conquista ou uma mensagem de consistência.</p>
            </>
          )}
        </div>
      )}

      {posts.map((post) => (
        <PostCard key={post.id} post={post} groupId={groupId} onRequireTerms={guard} />
      ))}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {isFetchingNextPage ? "Carregando..." : "Carregar mais"}
        </button>
      )}

      {modal}
    </div>
  );
}
