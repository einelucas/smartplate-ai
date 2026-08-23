// components/social/PostFeedList.tsx
// Feed reutilizável (comunidade geral ou grupo). Sempre dados reais — sem mocks.
"use client";

import { MessageSquareHeart } from "lucide-react";
import { useCommunityFeed } from "@/hooks/useCommunity";
import { useCommunityTermsGate } from "./CommunityTermsGate";
import PostComposer from "./PostComposer";
import PostCard from "./PostCard";

export default function PostFeedList({ groupId }: { groupId?: string }) {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useCommunityFeed(groupId);
  const { guard, modal } = useCommunityTermsGate();

  const posts = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-4">
      <PostComposer groupId={groupId} onRequireTerms={guard} />

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
          <p className="font-semibold text-slate-700">
            {groupId ? "Este grupo ainda não tem publicações." : "A comunidade ainda está começando."}
          </p>
          <p className="text-sm text-slate-500 mt-1">Compartilhe sua primeira conquista ou uma mensagem de consistência.</p>
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
